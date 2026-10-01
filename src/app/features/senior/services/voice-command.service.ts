import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AudioRecording } from '../../../core/models/permission.models';
import { AudioCaptureService } from '../../../core/services/audio-capture.service';
import { LiaSpeechPriority, LiaSpeechService } from '../../../core/services/lia-speech.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { VoiceApiService } from '../../../core/services/voice-api.service';
import { VoicePauseReason, VoiceSessionCoordinatorService } from '../../../core/services/voice-session-coordinator.service';
import { SeniorContact } from '../models/senior.models';
import { ContactsService } from './contacts.service';
import { EmergencyRequest, EmergencyService } from './emergency.service';
import { GlobalVoiceCommand, parseGlobalVoiceCommand } from './global-voice-command.parser';
import { LiaService } from './lia.service';

export type VoiceCommandState = 'off' | 'starting' | 'listening' | 'processing' | 'paused-lia' | 'paused-speech' | 'paused-hidden' | 'error';

export type VoiceCommandPrompt = { kind: 'SICK' } | { kind: 'CALL'; contact: SeniorContact };

export interface VoiceCommandFeedback {
  /** Lo que se escucho (solo frases dirigidas a VITALIA). */
  heard?: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
  action?: { label: string; route: string };
}

const FEEDBACK_MS = 9000;
const MAX_QUEUE = 2;
const CANCELLED_SPEECH = 'Está bien. He cancelado la acción.';
const HELP_STARTING_SPEECH = 'De acuerdo. Voy a iniciar la solicitud de ayuda.';
const firstName = (contact: SeniorContact) => contact.name.split(/\s+/)[0];

/**
 * Comandos globales de voz ("LIA, ..."). Solo escuchan mientras la persona los tiene activos y la pestana esta visible,
 * comparten microfono (coordinador) y Vosk con LIA, y terminan en los servicios existentes: emergencia, contactos,
 * ubicacion y LIA. Nunca guardan audio ni transcripciones; lo que no empieza con "LIA" se descarta sin mostrarse.
 * Cada respuesta se muestra y, si la voz de LIA esta activa, tambien se dice; mientras LIA habla la escucha se pausa.
 * Las frases habladas nunca contienen "LIA" ni terminan en "si"/"cancelar", para que un eco no dispare un comando.
 */
@Injectable({ providedIn: 'root' })
export class VoiceCommandService {
  private readonly audio = inject(AudioCaptureService);
  private readonly voiceApi = inject(VoiceApiService);
  private readonly coordinator = inject(VoiceSessionCoordinatorService);
  private readonly permissions = inject(PermissionsService);
  private readonly emergency = inject(EmergencyService);
  private readonly contacts = inject(ContactsService);
  private readonly lia = inject(LiaService);
  private readonly speech = inject(LiaSpeechService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private queue: AudioRecording[] = [];
  private draining = false;
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  readonly state = signal<VoiceCommandState>('off');
  readonly enabled = computed(() => this.state() !== 'off');
  readonly consentOpen = signal(false);
  readonly prompt = signal<VoiceCommandPrompt | null>(null);
  readonly feedback = signal<VoiceCommandFeedback | null>(null);
  readonly errorMessage = signal('');
  readonly hearingSpeech = this.audio.hearingSpeech;

  constructor() {
    this.coordinator.registerGlobal({ pause: (reason) => this.pause(reason), resume: () => void this.resumeListening() });
    const onVisibility = () => void this.onVisibilityChange();
    this.document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.disable();
      this.coordinator.unregisterGlobal();
    });
  }

  /** Paso 1: la persona pulsa "Activar comandos de voz". Nunca se activa sola. */
  async requestEnable(): Promise<void> {
    if (this.enabled()) return;
    this.errorMessage.set('');
    const permission = await this.permissions.checkMicrophonePermission();
    if (permission === 'denied') { this.fail('No tengo permiso para usar el micrófono. Puedes habilitarlo en la configuración del navegador.'); return; }
    if (permission === 'unavailable') { this.fail('No encontré un micrófono disponible en este dispositivo.'); return; }
    this.consentOpen.set(true);
  }

  /** Paso 2: consentimiento aceptado. */
  async acceptConsent(): Promise<void> {
    this.consentOpen.set(false);
    await this.startListening();
  }

  declineConsent(): void { this.consentOpen.set(false); }

  disable(): void {
    this.audio.stopContinuous();
    this.coordinator.releaseGlobal();
    this.queue = [];
    this.prompt.set(null);
    this.state.set('off');
  }

  /** Procesa una frase ya transcrita (usado por la cola y por las pruebas). */
  async handleTranscript(text: string): Promise<void> {
    const awaitingAnswer = !!this.prompt() || this.emergency.awaitingAnswer();
    const command = parseGlobalVoiceCommand(text, { awaitingAnswer });
    if (!command) return;
    await this.execute(command, text.trim());
  }

  /** "Me siento mal" -> [Solicitar ayuda]. */
  confirmSick(): void {
    this.prompt.set(null);
    this.startEmergency({ type: 'SICK', reason: 'Me siento mal', source: 'GLOBAL_VOICE' }, false);
  }

  dismissPrompt(): void { this.prompt.set(null); }

  /** La persona pulso "Llamar a ...": el enlace `tel:` abre el marcador; VITALIA nunca marca por su cuenta. */
  announceCall(contact: SeniorContact): void {
    this.speak(`De acuerdo. Voy a abrir el marcador para llamar a ${firstName(contact)}.`, 'HIGH');
  }

  private async execute(command: GlobalVoiceCommand, heard: string): Promise<void> {
    switch (command.intent) {
      case 'EMERGENCY_HELP':
        this.startEmergency({ type: 'HELP', reason: 'Necesito ayuda', source: 'GLOBAL_VOICE' }, true, heard,
          'Sí, te escuché. Voy a ayudarte. Si no lo necesitas, puedes cancelar la solicitud.');
        return;
      case 'EMERGENCY_FALL':
        // La cuenta regresiva avanza sola: si la persona no puede responder, la ayuda se solicita igualmente.
        this.startEmergency({ type: 'FALL', reason: 'Me caí', source: 'GLOBAL_VOICE' }, true, heard,
          'Te escuché. Entiendo que te has caído. ¿Quieres activar la emergencia? Si no respondes, la activaré en unos segundos.');
        return;
      case 'EMERGENCY_SICK':
        if (this.emergency.inProgress()) { this.reply(heard, 'Ya hay una solicitud de ayuda en curso.', 'info', 'CRITICAL'); return; }
        this.prompt.set({ kind: 'SICK' });
        this.say({ heard, message: 'He entendido que te sientes mal.', tone: 'warning' });
        this.speak('Sí, te escuché. Entiendo que te sientes mal. ¿Quieres que pida ayuda?', 'CRITICAL');
        return;
      case 'CALL_DAUGHTER':
        this.prepareCall(this.contacts.findByRelationship('hija'), 'No encontré a tu hija entre tus contactos autorizados.', heard,
          (contact) => `Encontré a ${contact.name}. ¿Quieres llamarla?`);
        return;
      case 'CALL_PRIMARY_CONTACT':
        this.prepareCall(this.contacts.primaryEmergencyContact(), 'Aún no tienes un contacto de emergencia.', heard,
          (contact) => `Encontré a tu contacto principal de emergencia, ${contact.name}. ¿Quieres llamarle?`);
        return;
      case 'OPEN_EMERGENCY':
        void this.router.navigateByUrl('/senior/emergency');
        this.say({ heard, message: 'Abrí la pantalla de emergencia.', tone: 'info' });
        this.speak('Sí, te escuché. Abrí la pantalla de emergencia.', 'NORMAL');
        return;
      case 'OPEN_LOCATION':
        // Es la persona quien pide su ubicacion: la pantalla la solicita (con consentimiento si hace falta) y dice el resultado.
        void this.router.navigate(['/senior/location'], { queryParams: { solicitar: Date.now() } });
        this.say({ heard, message: 'Voy a mostrar dónde estás.', tone: 'info' });
        this.speak('Sí, te escuché. Estoy buscando tu ubicación.', 'HIGH');
        return;
      case 'NEXT_MEDICATION': {
        const reply = await firstValueFrom(this.lia.respond(command.command || 'qué medicamento me toca'));
        this.say({ heard, message: reply.text, tone: 'info', action: { label: 'Ver medicamentos', route: '/senior/medications' } });
        this.speak(reply.speech ?? reply.text, 'NORMAL');
        return;
      }
      case 'CONFIRM':
        this.confirmByVoice(heard);
        return;
      case 'CANCEL':
        this.cancelByVoice(heard);
        return;
      default:
        this.say({ heard, message: 'No entendí la instrucción. Puedes decir: «LIA, necesito ayuda», «LIA, llama a mi hija» o «LIA, ¿dónde estoy?».', tone: 'warning' });
        this.speak('No entendí la instrucción. Puedes pedirme ayuda, llamar a tu hija o preguntarme dónde estás.', 'LOW');
    }
  }

  private startEmergency(request: EmergencyRequest, countdown: boolean, heard?: string, speech = HELP_STARTING_SPEECH): void {
    const started = countdown ? this.emergency.startVoiceRequest(request) : this.emergency.confirmRequest(request);
    if (!started) { this.reply(heard, 'Ya hay una solicitud de ayuda en curso.', 'info', 'CRITICAL'); return; }
    void this.router.navigateByUrl('/senior/emergency');
    this.say({ heard, message: countdown ? 'Voy a iniciar la solicitud de ayuda. Puedes cancelar.' : 'Estoy preparando tu solicitud de ayuda.', tone: 'warning' });
    this.speak(speech, 'CRITICAL');
  }

  private prepareCall(contact: SeniorContact | null, missing: string, heard: string, question: (contact: SeniorContact) => string): void {
    if (!contact) { this.reply(heard, missing, 'warning', 'HIGH'); return; }
    this.prompt.set({ kind: 'CALL', contact });
    this.say({ heard, message: `Prepararé una llamada para ${contact.name}.`, tone: 'info' });
    this.speak(question(contact), 'HIGH');
  }

  private confirmByVoice(heard: string): void {
    const prompt = this.prompt();
    if (prompt?.kind === 'SICK') { this.confirmSick(); return; }
    if (prompt?.kind === 'CALL') {
      // Nunca se marca por voz: solo el boton abre el marcador.
      const name = firstName(prompt.contact);
      this.say({ heard, message: `Pulsa «Llamar a ${name}» para abrir el marcador.`, tone: 'info' });
      this.speak(`De acuerdo. Para abrir el marcador, pulsa Llamar a ${name}.`, 'HIGH');
      return;
    }
    if (this.emergency.consentOpen()) { this.speak('De acuerdo.', 'CRITICAL'); void this.emergency.acceptLocationConsent(); return; }
    // "Sí" durante la cuenta regresiva por voz adelanta la solicitud (LIA lo pregunta, p. ej., tras "Me caí").
    const voiceCountdown = this.emergency.step() === 'countdown' && this.emergency.autoConfirm();
    if (this.emergency.step() === 'confirmed' || voiceCountdown) { this.speak(HELP_STARTING_SPEECH, 'CRITICAL'); void this.emergency.confirm(); }
  }

  private cancelByVoice(heard: string): void {
    if (this.prompt()) {
      this.prompt.set(null);
      this.say({ heard, message: 'De acuerdo, lo cancelé.', tone: 'info' });
      this.speak(CANCELLED_SPEECH, 'HIGH', true);
      return;
    }
    if (this.emergency.consentOpen()) { this.emergency.declineLocationConsent(); return; }
    if (this.emergency.awaitingAnswer()) {
      this.emergency.cancel();
      this.say({ heard, message: 'Cancelé la solicitud de ayuda.', tone: 'success' });
      this.speak(CANCELLED_SPEECH, 'CRITICAL', true);
      return;
    }
    this.reply(heard, 'No hay nada que cancelar.', 'info', 'LOW');
  }

  private async startListening(): Promise<void> {
    if (!this.coordinator.requestGlobal()) { this.state.set(this.coordinator.owner() === 'LIA' ? 'paused-lia' : 'paused-speech'); return; }
    this.state.set('starting');
    const started = await this.audio.startContinuous((recording) => this.enqueue(recording));
    if (this.state() === 'off') { this.audio.stopContinuous(); return; }
    // Se oculto la pestana o se pauso (LIA escucha o habla) mientras arrancaba: lo reanudara quien lo pauso.
    if (this.state() !== 'starting') return;
    if (!started) {
      this.coordinator.releaseGlobal();
      this.fail(this.audio.errorMessage() || 'No pude activar los comandos de voz.');
      return;
    }
    this.state.set('listening');
  }

  private pause(reason: VoicePauseReason): void {
    if (!this.enabled()) return;
    this.audio.stopContinuous();
    this.state.set(reason === 'LIA' ? 'paused-lia' : 'paused-speech');
  }

  private async resumeListening(): Promise<void> {
    if (this.state() === 'paused-lia' || this.state() === 'paused-speech') await this.startListening();
  }

  private async onVisibilityChange(): Promise<void> {
    if (!this.enabled()) return;
    if (this.document.visibilityState === 'hidden') {
      // AudioCaptureService ya libero el microfono; queda en pausa hasta volver a la pestana.
      this.audio.stopContinuous();
      this.coordinator.releaseGlobal();
      this.state.set('paused-hidden');
    } else if (this.state() === 'paused-hidden') {
      await this.startListening();
    }
  }

  private enqueue(recording: AudioRecording): void {
    if (this.queue.length >= MAX_QUEUE) this.queue.shift();
    this.queue.push(recording);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length && this.enabled()) {
        const recording = this.queue.shift()!;
        if (this.state() === 'listening') this.state.set('processing');
        try {
          await this.handleTranscript(await this.voiceApi.transcribe(recording));
        } catch {
          this.say({ message: 'No pude procesar tu voz. Puedes seguir usando la pantalla.', tone: 'warning' });
        } finally {
          if (this.state() === 'processing') this.state.set('listening');
        }
      }
    } finally {
      this.draining = false;
    }
  }

  /** Mismo mensaje en pantalla y en voz. */
  private reply(heard: string | undefined, message: string, tone: VoiceCommandFeedback['tone'], priority: LiaSpeechPriority): void {
    this.say({ heard, message, tone });
    this.speak(message, priority);
  }

  private speak(text: string, priority: LiaSpeechPriority, interrupt = false): void {
    void this.speech.speak(text, { priority, interrupt });
  }

  private say(feedback: VoiceCommandFeedback): void {
    this.feedback.set(feedback);
    clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => { if (this.feedback() === feedback) this.feedback.set(null); }, FEEDBACK_MS);
  }

  private fail(message: string): void {
    this.errorMessage.set(message);
    this.state.set('off');
  }
}

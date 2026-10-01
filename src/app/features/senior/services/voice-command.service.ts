import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageContextService } from '../../../core/i18n/language-context.service';
import { LocalizedText, PhraseKey, VariantId } from '../../../core/i18n/language.models';
import { loosePhrase, normalizeVoicePhrase } from '../../../core/i18n/normalize-voice-phrase';
import { intentKey, PhraseParams, PhrasebookService } from '../../../core/i18n/phrasebook.service';
import { AudioRecording } from '../../../core/models/permission.models';
import { AudioCaptureService } from '../../../core/services/audio-capture.service';
import { LiaOutputService } from '../../../core/services/lia-output.service';
import { LiaSpeechPriority, LiaSpeechService } from '../../../core/services/lia-speech.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { SpeechRecognitionRegistry } from '../../../core/services/speech-recognition.providers';
import { VoiceDebugLogService } from '../../../core/services/voice-debug-log.service';
import { VoicePauseReason, VoiceSessionCoordinatorService } from '../../../core/services/voice-session-coordinator.service';
import { SeniorContact } from '../models/senior.models';
import { ContactsService } from './contacts.service';
import { EmergencyRequest, EmergencyService } from './emergency.service';
import { GlobalVoiceCommand, parseGlobalVoiceCommand } from './global-voice-command.parser';
import { IntentLexiconService } from './intent-lexicon';
import { LiaService } from './lia.service';

export type VoiceCommandState = 'off' | 'starting' | 'wake-listening' | 'command-listening' | 'processing' | 'speaking' | 'paused-lia' | 'paused-speech' | 'paused-hidden' | 'error';

/** Pregunta pendiente de un "sí"/"cancelar". MEDICATION: "¿Quieres que marque la toma...?" (sin diálogo). */
export type VoiceCommandPrompt = { kind: 'SICK' } | { kind: 'CALL'; contact: SeniorContact } | { kind: 'MEDICATION' };

export interface VoiceCommandFeedback {
  /** Lo que se escucho (solo frases dirigidas a VITALIA). */
  heard?: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
  action?: { label: string; route: string };
  /** El mensaje se muestra en espanol porque la lengua de la conversacion no tiene esa frase. */
  translationPending?: boolean;
  /** Frase predeterminada de un idioma piloto (sin validacion nativa). */
  pilotText?: boolean;
}

const FEEDBACK_MS = 9000;
/** La pregunta "¿Quieres que marque la toma...?" deja de esperar respuesta pasado este tiempo. */
const MEDICATION_PROMPT_MS = 30000;
const PILOT_RECOGNITION_NOTICE = 'Reconocimiento experimental: tu voz se aproxima con Vosk en español. Si no te entiendo, usa español o los botones.';
const MAX_QUEUE = 2;
const WAKE_WORD = /\bhola\s+lia\b/;
const firstName = (contact: SeniorContact) => contact.name.split(/\s+/)[0];

/**
 * Comandos globales de voz ("LIA, ..."). Solo escuchan mientras la persona los tiene activos y la pestana esta visible,
 * comparten microfono (coordinador) y Vosk con LIA, y terminan en los servicios existentes: emergencia, contactos,
 * ubicacion y LIA. Nunca guardan audio ni transcripciones; lo que no empieza con "LIA" se descarta sin mostrarse.
 * Cada respuesta se muestra y, si la voz de LIA esta activa, tambien se dice, en la lengua en que llego el comando;
 * mientras LIA habla la escucha se pausa. Las frases habladas nunca contienen "LIA" ni terminan en "si"/"cancelar",
 * para que un eco no dispare un comando.
 */
@Injectable({ providedIn: 'root' })
export class VoiceCommandService {
  private readonly audio = inject(AudioCaptureService);
  private readonly coordinator = inject(VoiceSessionCoordinatorService);
  private readonly permissions = inject(PermissionsService);
  private readonly emergency = inject(EmergencyService);
  private readonly contacts = inject(ContactsService);
  private readonly lia = inject(LiaService);
  private readonly output = inject(LiaOutputService);
  private readonly phrases = inject(PhrasebookService);
  private readonly lexicons = inject(IntentLexiconService);
  private readonly language = inject(LanguageContextService);
  private readonly recognition = inject(SpeechRecognitionRegistry);
  private readonly debug = inject(VoiceDebugLogService);
  private readonly speech = inject(LiaSpeechService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private queue: AudioRecording[] = [];
  private draining = false;
  private feedbackTimer?: ReturnType<typeof setTimeout>;
  private promptTimer?: ReturnType<typeof setTimeout>;
  private lastSpeechDone: Promise<boolean> = Promise.resolve(false);
  /** Lengua del comando que se esta atendiendo: la respuesta sale en la misma. */
  private variant: VariantId = this.language.interactionVariant();

  readonly state = signal<VoiceCommandState>('off');
  readonly enabled = computed(() => this.state() !== 'off');
  readonly consentOpen = signal(false);
  readonly prompt = signal<VoiceCommandPrompt | null>(null);
  readonly feedback = signal<VoiceCommandFeedback | null>(null);
  readonly errorMessage = signal('');
  readonly hearingSpeech = this.audio.hearingSpeech;
  /** Aviso visible: en los idiomas piloto no hay ASR nativo y la voz se aproxima con Vosk en espanol. */
  readonly languageNotice = computed(() => (this.language.interactionVariant() === 'es' ? '' : PILOT_RECOGNITION_NOTICE));

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
    // Precalienta el motor TTS del navegador con un gesto de usuario activo para que la primera
    // respuesta hablada de LIA no quede silenciada por la política de autoplay de Chrome/Edge.
    this.speech.prime();
    await this.startListening();
  }

  declineConsent(): void { this.consentOpen.set(false); }

  disable(): void {
    clearTimeout(this.promptTimer);
    this.audio.stopContinuous();
    this.coordinator.releaseGlobal();
    this.queue = [];
    this.prompt.set(null);
    this.state.set('off');
  }

  private logLifecycle(message: string): void { this.debug.lifecycle(message); }

  /** Procesa una frase ya transcrita (usado por la cola y por las pruebas) en la lengua indicada. */
  async handleTranscript(text: string, variant: VariantId = this.language.interactionVariant()): Promise<void> {
    const awaitingAnswer = !!this.prompt() || this.emergency.awaitingAnswer();
    const command = parseGlobalVoiceCommand(text, { awaitingAnswer, lexicons: this.lexicons.chainFor(variant) });
    this.debug.log({
      language: variant,
      heard: text,
      normalized: normalizeVoicePhrase(text),
      candidate: command?.intent ?? null,
      confidence: command?.confidence ?? null,
      action: !command ? 'descartada (sin LIA)' : command.intent === 'UNKNOWN' ? 'ninguna' : command.intent,
    });
    if (!command) return;
    this.variant = command.variant;
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
    this.speak(this.line('voice.call.opening', { firstName: firstName(contact) }), 'HIGH');
  }

  private async execute(command: GlobalVoiceCommand, heard: string): Promise<void> {
    switch (command.intent) {
      case 'EMERGENCY_HELP':
        // Solo llega aqui con confianza alta (umbral estricto de HELP); la cuenta regresiva se puede cancelar.
        this.startEmergency({ type: 'HELP', reason: 'Necesito ayuda', source: 'GLOBAL_VOICE' }, true, heard, intentKey('HELP', 'response'));
        return;
      case 'EMERGENCY_FALL':
        // La cuenta regresiva avanza sola: si la persona no puede responder, la ayuda se solicita igualmente.
        this.startEmergency({ type: 'FALL', reason: 'Me caí', source: 'GLOBAL_VOICE' }, true, heard, 'voice.fall.speech');
        return;
      case 'EMERGENCY_SICK':
        if (this.emergency.inProgress()) { this.reply(heard, this.line('voice.emergencyInProgress'), 'info', 'CRITICAL'); return; }
        this.prompt.set({ kind: 'SICK' });
        this.show(heard, this.line('voice.sick.feedback'), 'warning');
        this.speak(this.line('voice.sick.speech'), 'CRITICAL');
        return;
      case 'CALL_DAUGHTER':
        this.prepareCall(this.contacts.findByRelationship('hija'), 'voice.daughter.missing', heard, intentKey('CALL_DAUGHTER', 'response'));
        return;
      case 'CALL_PRIMARY_CONTACT':
        this.prepareCall(this.contacts.primaryEmergencyContact(), 'voice.primary.missing', heard, 'voice.primary.found');
        return;
      case 'OPEN_EMERGENCY':
        void this.router.navigateByUrl('/senior/emergency');
        this.show(heard, this.line('voice.emergencyOpened.feedback'), 'info');
        this.speak(this.line('voice.emergencyOpened.speech'), 'NORMAL');
        return;
      case 'OPEN_LOCATION':
        // Es la persona quien pide su ubicacion: la pantalla la solicita (con consentimiento si hace falta) y dice el resultado.
        void this.router.navigate(['/senior/location'], { queryParams: { solicitar: Date.now() } });
        this.show(heard, this.line('voice.location.feedback'), 'info');
        this.speak(this.line('voice.location.speech'), 'HIGH');
        return;
      case 'NEXT_MEDICATION': {
        const reply = await firstValueFrom(this.lia.respondToIntent('NEXT_MEDICATION', this.variant));
        this.show(heard, reply.message, 'info', { label: 'Ver medicamentos', route: '/senior/medications' });
        this.speak(reply.spoken ?? reply.message, 'NORMAL');
        if (reply.message.key === intentKey('NEXT_MEDICATION', 'response')) this.askMedication();
        return;
      }
      case 'CONFIRM':
        this.confirmByVoice(heard);
        return;
      case 'CANCEL':
        this.cancelByVoice(heard);
        return;
      default:
        // Idioma piloto sin coincidencia segura: aviso en espanol (respaldo marcado) y ninguna accion.
        if (this.variant !== 'es') { this.reply(heard, this.line('voice.pilotNotRecognized'), 'warning', 'LOW'); return; }
        this.show(heard, this.line('voice.unknown.feedback'), 'warning');
        this.speak(this.line('voice.unknown.speech'), 'LOW');
    }
  }

  private startEmergency(request: EmergencyRequest, countdown: boolean, heard?: string, speech: PhraseKey = intentKey('HELP', 'confirmation')): void {
    const started = countdown ? this.emergency.startVoiceRequest(request) : this.emergency.confirmRequest(request);
    if (!started) { this.reply(heard, this.line('voice.emergencyInProgress'), 'info', 'CRITICAL'); return; }
    void this.router.navigateByUrl('/senior/emergency');
    this.show(heard, this.line(countdown ? 'voice.emergencyStarting.countdown' : 'voice.emergencyStarting.confirmed'), 'warning');
    this.speak(this.line(speech), 'CRITICAL');
  }

  private prepareCall(contact: SeniorContact | null, missing: PhraseKey, heard: string, question: PhraseKey): void {
    if (!contact) { this.reply(heard, this.line(missing), 'warning', 'HIGH'); return; }
    this.setPrompt({ kind: 'CALL', contact });
    // La hija tiene respuesta propia en cada idioma ("Encontre a {contactName}..."): se muestra y se dice esa.
    const daughter = question === intentKey('CALL_DAUGHTER', 'response');
    const params = { contact: contact.name, contactName: contact.name };
    this.show(heard, this.line(daughter ? question : 'voice.call.prepared', params), 'info');
    this.speak(this.line(question, params), 'HIGH');
  }

  /** "¿Quieres que marque la toma como realizada cuando lo tomes?": espera un "si" un rato, sin dialogo. */
  private askMedication(): void {
    const prompt: VoiceCommandPrompt = { kind: 'MEDICATION' };
    this.setPrompt(prompt);
    this.promptTimer = setTimeout(() => { if (this.prompt() === prompt) this.prompt.set(null); }, MEDICATION_PROMPT_MS);
  }

  private setPrompt(prompt: VoiceCommandPrompt): void {
    clearTimeout(this.promptTimer);
    this.prompt.set(prompt);
  }

  private confirmByVoice(heard: string): void {
    const prompt = this.prompt();
    if (prompt?.kind === 'SICK') { this.confirmSick(); return; }
    if (prompt?.kind === 'CALL') {
      // Nunca se marca por voz: solo el boton abre el marcador.
      const name = firstName(prompt.contact);
      const daughter = prompt.contact.id === this.contacts.findByRelationship('hija')?.id;
      this.show(heard, this.line('voice.call.press.feedback', { firstName: name }), 'info');
      this.speak(this.line(daughter ? intentKey('CALL_DAUGHTER', 'confirmation') : 'voice.call.press.speech', { firstName: name }), 'HIGH');
      return;
    }
    if (prompt?.kind === 'MEDICATION') {
      // La toma solo se registra con el boton "Ya la tome" de Medicamentos.
      this.prompt.set(null);
      this.reply(heard, this.line(intentKey('NEXT_MEDICATION', 'confirmation')), 'info', 'NORMAL');
      return;
    }
    if (this.emergency.consentOpen()) { this.speak(this.line('voice.confirm.ok'), 'CRITICAL'); void this.emergency.acceptLocationConsent(); return; }
    // "Sí" durante la cuenta regresiva por voz adelanta la solicitud (LIA lo pregunta, p. ej., tras "Me caí").
    const voiceCountdown = this.emergency.step() === 'countdown' && this.emergency.autoConfirm();
    if (this.emergency.step() === 'confirmed' || voiceCountdown) { this.speak(this.line(intentKey('HELP', 'confirmation')), 'CRITICAL'); void this.emergency.confirm(); }
  }

  private cancelByVoice(heard: string): void {
    if (this.prompt()) {
      this.prompt.set(null);
      this.show(heard, this.line('voice.cancel.prompt'), 'info');
      this.speak(this.line('voice.cancel.speech'), 'HIGH', true);
      return;
    }
    if (this.emergency.consentOpen()) { this.emergency.declineLocationConsent(); return; }
    if (this.emergency.awaitingAnswer()) {
      this.emergency.cancel();
      this.show(heard, this.line('voice.cancel.emergency'), 'success');
      this.speak(this.line('voice.cancel.speech'), 'CRITICAL', true);
      return;
    }
    this.reply(heard, this.line('voice.cancel.nothing'), 'info', 'LOW');
  }

  private async startListening(): Promise<void> {
    if (this.state() === 'wake-listening' || this.state() === 'command-listening' || this.state() === 'processing') return;
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
    this.state.set('wake-listening');
    this.logLifecycle('👂 Wake word listener activo');
    this.logLifecycle('💤 Esperando "Hola LIA"');
  }

  private pause(reason: VoicePauseReason): void {
    if (!this.enabled()) return;
    this.audio.stopContinuous();
    this.state.set(reason === 'LIA' ? 'paused-lia' : 'speaking');
  }

  private async resumeListening(): Promise<void> {
    if (this.state() === 'paused-lia' || this.state() === 'paused-speech' || this.state() === 'speaking') {
      this.logLifecycle('💤 Regresando a espera de "Hola LIA"');
      await this.startListening();
    }
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
        try {
          const result = await this.recognition.forVariant(this.language.interactionVariant()).transcribe(recording);
          if (this.state() === 'wake-listening') {
            if (!this.isWakeWord(result.text)) continue;
            this.state.set('command-listening');
            this.logLifecycle('✅ Wake word detectada');
            this.logLifecycle('🎙️ Cambiando a escucha de comando');
            continue;
          }
          if (this.state() !== 'command-listening') continue;
          this.state.set('processing');
          this.lastSpeechDone = Promise.resolve(false);
          await this.handleTranscript(result.text, result.variant);
          await this.lastSpeechDone;
          if (this.state() === 'processing' || (this.state() === 'speaking' && !this.coordinator.speaking())) this.returnToWakeListening();
        } catch {
          if (this.state() === 'processing') {
            this.show(undefined, this.line('voice.processingError'), 'warning');
            this.returnToWakeListening();
          }
        } finally {
          // Si LIA habla, el coordinador conserva el estado speaking y reanuda al terminar el TTS.
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private isWakeWord(text: string): boolean { return WAKE_WORD.test(loosePhrase(text)); }

  private returnToWakeListening(): void {
    if (!this.enabled() || (this.state() !== 'processing' && this.state() !== 'speaking')) return;
    this.state.set('wake-listening');
    this.logLifecycle('💤 Regresando a espera de "Hola LIA"');
  }

  /** Texto de la plantilla en la lengua del comando en curso. */
  private line(key: PhraseKey, params?: PhraseParams): LocalizedText {
    return this.phrases.t(key, params, this.variant);
  }

  /** Mismo mensaje en pantalla y en voz. */
  private reply(heard: string | undefined, message: LocalizedText, tone: VoiceCommandFeedback['tone'], priority: LiaSpeechPriority): void {
    this.show(heard, message, tone);
    this.speak(message, priority);
  }

  private speak(message: LocalizedText, priority: LiaSpeechPriority, interrupt = false): void {
    const report = this.output.deliver(message, { priority, interrupt });
    this.lastSpeechDone = report.done;
    if (this.enabled() && (this.state() === 'processing' || this.state() === 'command-listening')) {
      this.state.set('speaking');
      this.logLifecycle('🔊 LIA respondiendo');
    }
  }

  /** Muestra el mensaje en su lengua o, si falta la frase, en espanol con aviso visible. */
  private show(heard: string | undefined, message: LocalizedText, tone: VoiceCommandFeedback['tone'], action?: VoiceCommandFeedback['action']): void {
    this.say({
      heard,
      message: message.text,
      tone,
      ...(action ? { action } : {}),
      ...(!message.available ? { translationPending: true } : {}),
      ...(message.available && message.variant !== 'es' ? { pilotText: true } : {}),
    });
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

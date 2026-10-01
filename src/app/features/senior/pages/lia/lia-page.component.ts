import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VitaliaPermissionState } from '../../../../core/models/permission.models';
import { AudioCaptureService } from '../../../../core/services/audio-capture.service';
import { LiaSpeechPriority, LiaSpeechService } from '../../../../core/services/lia-speech.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { VoiceApiService } from '../../../../core/services/voice-api.service';
import { VoiceSessionCoordinatorService } from '../../../../core/services/voice-session-coordinator.service';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { ConsentDialogComponent } from '../../../../shared/ui/consent-dialog/consent-dialog.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../../shared/ui/status-badge/status-badge.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { LiaAction, LiaIntent, LiaMessage, LiaNavigation, LiaReply, LiaState } from '../../models/senior.models';
import { EmergencyService } from '../../services/emergency.service';
import { LiaService } from '../../services/lia.service';
import { SeniorStateService } from '../../services/senior-state.service';

const SPEECH_PRIORITY: Readonly<Record<LiaIntent, LiaSpeechPriority>> = {
  START_EMERGENCY: 'CRITICAL',
  CALL_FAMILY: 'HIGH', OPEN_LOCATION: 'HIGH',
  NEXT_MEDICATION: 'NORMAL', MEDICATION_TAKEN: 'NORMAL', START_CHECKIN: 'NORMAL', MEMORY_ACTIVITY: 'NORMAL', PENSION_INFO: 'NORMAL',
  UNKNOWN: 'LOW',
};
/** Solo si la respuesta por voz tarda: primero "te escuché" y, si sigue tardando, "estoy procesando". */
const HEARD_NOTICE_MS = 1200;
const PROCESSING_NOTICE_MS = 4000;
/** Tiempo minimo para leer la respuesta antes de abrir la pantalla (tambien con la voz desactivada). */
const OPEN_SCREEN_MIN_MS = 1500;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, ConsentDialogComponent, FormsModule, SeniorPageComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-lia-page',
  template: `
    <app-senior-page eyebrow="Tu compañera inteligente" title="Hablar con LIA" description="Escríbele o háblale. Tu voz se convierte en texto y no se guarda." backPath="/senior">
      <section class="lia-hero" [class.lia-hero--listening]="state() === 'listening'" [class.lia-hero--busy]="active" aria-label="Estado de LIA">
        <div class="lia-avatar" aria-hidden="true">
          <span class="lia-avatar__ring lia-avatar__ring--outer"></span><span class="lia-avatar__ring"></span>
          <span class="lia-avatar__core"><app-vitalia-icon [name]="recording ? 'microphone' : 'sparkles'" [size]="40" /></span>
        </div>
        <div class="lia-hero__text">
          <p class="lia-hero__name">LIA</p>
          <app-status-badge [variant]="statusTone">{{ statusLabel }}</app-status-badge>
          <p>{{ statusDescription }}</p>
        </div>
        <button type="button" class="mic-button" [class.mic-button--recording]="recording" [disabled]="voiceDisabled" (click)="toggleVoice()">
          <app-vitalia-icon [name]="recording ? 'close' : 'microphone'" [size]="34" /><span>{{ recording ? 'Detener' : 'Hablar' }}</span>
        </button>
      </section>

      @if (state() === 'listening') {
        <p class="mic-live" role="status"><span class="mic-live__dot" aria-hidden="true"></span><strong>Micrófono activado</strong><span>Pulsa «Detener» cuando termines de hablar.</span></p>
      }
      @if (voiceNotice()) {
        <div class="senior-page__notice senior-page__notice--warning" role="status"><app-vitalia-icon name="microphone" /><p><strong>{{ voiceNotice() }}</strong><span>También puedes escribir tus mensajes.</span></p></div>
      }

      <section class="conversation" aria-label="Conversación con LIA" aria-live="polite">
        @for (message of messages(); track message.id) {
          <div class="message" [class.message--user]="message.sender === 'user'" [class.message--lia]="message.sender === 'lia'">
            <strong>{{ message.sender === 'lia' ? 'LIA' : 'Tú' }}@if (message.viaVoice) { <span class="via-voice"><app-vitalia-icon name="microphone" [size]="14" /> por voz</span> }</strong><p>{{ message.text }}</p>
            @if (message.confirmation) { <span class="confirmation"><app-vitalia-icon name="check" [size]="18" /> Acción guardada</span> }
            @if (message.action; as action) { <app-button icon="chevron-right" [variant]="action.emergency ? 'emergency' : 'secondary'" (pressed)="openAction(action)">{{ action.label }}</app-button> }
          </div>
        }
        @if (state() === 'processing') { <div class="message message--lia typing" role="status"><span></span><span></span><span></span><span class="sr-only">{{ transcribing() ? 'LIA está procesando tu voz' : 'LIA está pensando' }}</span></div> }
      </section>

      <section aria-labelledby="quick-prompts"><h2 id="quick-prompts">Puedes preguntarme</h2><div class="quick-grid">
        @for (prompt of quickPrompts; track prompt) { <button type="button" [disabled]="busy" (click)="send(prompt)">{{ prompt }}</button> }
      </div></section>

      <form class="composer" (ngSubmit)="sendDraft()">
        <label class="sr-only" for="lia-message">Escribe un mensaje para LIA</label>
        <input id="lia-message" class="v-input" name="message" [(ngModel)]="draft" [disabled]="busy" placeholder="Escribe aquí…" autocomplete="off" />
        <app-button type="submit" [disabled]="!draft.trim() || busy">Enviar</app-button>
      </form>
      <app-button variant="ghost" (pressed)="goFamily()">Abrir Familia</app-button>

      <app-consent-dialog [open]="consentOpen()" icon="microphone"
        heading="¿Permites que VITALIA use tu micrófono?"
        description="LIA utiliza el micrófono cuando decides hablar con ella. No se activa de forma permanente."
        note="También puedes escribir tus mensajes."
        confirmLabel="Permitir micrófono" dismissLabel="Ahora no"
        (confirmed)="acceptMicrophone()" (dismissed)="declineMicrophone()" />
    </app-senior-page>
  `,
  styleUrl: './lia-page.component.scss',
})
export class LiaPageComponent implements OnDestroy {
  private readonly lia = inject(LiaService);
  private readonly seniorState = inject(SeniorStateService);
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionsService);
  private readonly audio = inject(AudioCaptureService);
  private readonly voiceApi = inject(VoiceApiService);
  private readonly coordinator = inject(VoiceSessionCoordinatorService);
  private readonly emergency = inject(EmergencyService);
  private readonly speech = inject(LiaSpeechService);
  protected readonly transcribing = signal(false);
  private completionTimer?: number;
  private waitingTimers: ReturnType<typeof setTimeout>[] = [];
  /** Invalida la apertura de pantalla pendiente si la persona sigue hablando o envia otro mensaje. */
  private replyToken = 0;
  private destroyed = false;
  /** `requesting` y `stopped` son estados exclusivos de la entrada por voz. */
  protected readonly state = signal<LiaState | 'requesting' | 'stopped'>('idle');
  protected readonly consentOpen = signal(false);
  protected readonly voiceNotice = signal('');
  protected readonly messages = signal<readonly LiaMessage[]>([
    { id: 'lia-welcome', sender: 'lia', text: 'Hola, María. Estoy aquí para ayudarte. ¿Qué necesitas hoy?' },
  ]);
  protected readonly quickPrompts = [
    '¿Qué medicamento me toca?', '¿Cuándo depositan mi pensión?', 'Muéstrame ejercicios de memoria',
    'Quiero hablar con mi hija', 'Necesito ayuda', 'Ya me tomé mi medicamento',
  ] as const;
  protected draft = '';

  protected get busy(): boolean { return ['requesting', 'listening', 'processing', 'speaking'].includes(this.state()); }
  protected get active(): boolean { return !['idle', 'completed', 'stopped', 'error'].includes(this.state()); }
  protected get recording(): boolean { return this.state() === 'listening' || this.state() === 'requesting'; }
  protected get voiceDisabled(): boolean { return this.state() === 'processing' || this.state() === 'speaking'; }
  protected get statusLabel(): string { return { idle: 'Lista', requesting: 'Solicitando permiso', listening: 'Escuchando', stopped: 'Detenido', processing: 'Procesando', speaking: 'Respondiendo', completed: 'Completado', error: 'Error' }[this.state()]; }
  protected get statusTone(): StatusBadgeVariant { return this.state() === 'error' ? 'urgent' : this.state() === 'completed' ? 'success' : this.busy ? 'pending' : 'normal'; }
  protected get statusDescription(): string { return { idle: 'Elige una pregunta o escribe tu mensaje.', requesting: 'Confirma el uso del micrófono en tu navegador.', listening: 'Te escucho. Puedes hablar con calma.', stopped: 'El micrófono ya está apagado.', processing: this.transcribing() ? 'Estoy convirtiendo tu voz en texto.' : 'Estoy preparando una respuesta sencilla.', speaking: 'Aquí tienes la información.', completed: 'La acción terminó correctamente.', error: 'Algo no salió bien. Intenta nuevamente.' }[this.state()]; }

  protected sendDraft(): void {
    const message = this.draft.trim();
    if (!message) return;
    this.draft = '';
    this.send(message);
  }

  protected send(prompt: string, viaVoice = false): void {
    if (this.busy) return;
    const token = ++this.replyToken;
    this.messages.update((items) => [...items, { id: `user-${Date.now()}`, sender: 'user', text: prompt, viaVoice }]);
    this.state.set('processing');
    this.lia.respond(prompt).subscribe({
      next: (reply) => {
        this.state.set('speaking');
        this.completionTimer = globalThis.setTimeout(() => {
          const pending = this.seniorState.nextMedication();
          const medicationRecorded = reply.intent === 'MEDICATION_TAKEN' && !!pending;
          if (medicationRecorded) this.seniorState.takeMedication(pending.id);
          this.messages.update((items) => [...items, { id: `lia-${Date.now()}`, sender: 'lia', text: reply.text, confirmation: medicationRecorded, action: reply.action }]);
          this.state.set('completed');
          this.answer(reply, medicationRecorded, token);
        }, 450);
      },
      error: () => { this.clearWaiting(); this.coordinator.releaseLia(); this.state.set('error'); },
    });
  }

  /** LIA dice la respuesta (el texto sigue en pantalla), devuelve el turno de voz y abre la pantalla existente si toca. */
  private answer(reply: LiaReply, medicationRecorded: boolean, token: number): void {
    this.clearWaiting();
    // Solo se confirma por voz lo que de verdad quedo registrado.
    const text = reply.intent === 'MEDICATION_TAKEN' && !medicationRecorded ? 'No tienes medicamentos pendientes por registrar.' : reply.speech ?? reply.text;
    const spoken = this.speech.speak(text, { priority: SPEECH_PRIORITY[reply.intent] });
    // Si LIA esta hablando, los comandos globales esperan a que termine (coordinador).
    this.coordinator.releaseLia();
    if (reply.opens) void this.openWhenDone(reply.opens, spoken, token);
  }

  private async openWhenDone(target: LiaNavigation, spoken: Promise<boolean>, token: number): Promise<void> {
    await Promise.all([spoken, new Promise((resolve) => globalThis.setTimeout(resolve, OPEN_SCREEN_MIN_MS))]);
    // La persona pudo volver a hablar, enviar otro mensaje o salir mientras LIA respondia.
    if (this.destroyed || token !== this.replyToken || this.recording) return;
    void this.router.navigate([target.route], { queryParams: target.queryParams });
  }

  /** El microfono solo se activa por accion explicita del usuario y nunca de forma automatica. */
  protected async toggleVoice(): Promise<void> {
    if (this.recording) { await this.stopVoice(); return; }
    if (this.voiceDisabled) return;
    this.voiceNotice.set('');
    const permission = await this.permissions.checkMicrophonePermission();
    if (permission === 'denied' || permission === 'unavailable') { this.showVoiceFallback(permission); return; }
    if (permission === 'prompt' && !this.permissions.hasSeenExplanation('microphone')) { this.consentOpen.set(true); return; }
    await this.startVoice();
  }

  protected async acceptMicrophone(): Promise<void> {
    this.permissions.markExplanationSeen('microphone');
    this.consentOpen.set(false);
    await this.startVoice();
  }

  protected declineMicrophone(): void {
    this.consentOpen.set(false);
    this.voiceNotice.set('De acuerdo, no usaré el micrófono.');
  }

  private async startVoice(): Promise<void> {
    this.replyToken++;
    this.clearWaiting();
    this.state.set('requesting');
    // LIA tiene prioridad: si los comandos globales escuchaban, se pausan hasta que LIA termine; si LIA hablaba, se calla.
    this.coordinator.acquireLia();
    const started = await this.audio.start();
    if (started) { this.state.set('listening'); return; }
    this.coordinator.releaseLia();
    if (this.audio.status() !== 'error') { this.state.set('idle'); return; }
    this.showVoiceFallback(this.permissions.microphone());
  }

  /**
   * Detener -> Procesando (FastAPI + Vosk) -> texto -> LiaService, igual que un mensaje escrito.
   * El microfono ya esta cerrado, pero LIA conserva el turno hasta responder: asi la escucha global no se reabre
   * entre medias y solo se reanuda cuando LIA termina de hablar.
   */
  private async stopVoice(): Promise<void> {
    const recording = await this.audio.stop();
    if (!recording) { this.coordinator.releaseLia(); this.state.set('stopped'); return; }
    this.state.set('processing');
    this.transcribing.set(true);
    this.scheduleWaitingNotices();
    try {
      const text = await this.voiceApi.transcribe(recording);
      this.state.set('stopped');
      if (!text) { this.voiceFailed('No logré entender lo que dijiste. Intenta de nuevo, más cerca del micrófono.'); return; }
      this.send(text, true);
    } catch (error) {
      this.state.set('idle');
      this.voiceFailed(error instanceof Error ? error.message : 'No pude procesar tu voz. Puedes seguir escribiendo.');
    } finally {
      this.transcribing.set(false);
    }
  }

  private voiceFailed(message: string): void {
    this.clearWaiting();
    this.voiceNotice.set(message);
    void this.speech.speak(message, { priority: 'NORMAL' });
    this.coordinator.releaseLia();
  }

  /** Si la respuesta es inmediata no se dice ninguno de los dos avisos; la respuesta real los interrumpe o los sigue. */
  private scheduleWaitingNotices(): void {
    this.clearWaiting();
    this.waitingTimers = [
      globalThis.setTimeout(() => void this.speech.speak('Sí, te escuché.', { priority: 'NORMAL' }), HEARD_NOTICE_MS),
      globalThis.setTimeout(() => void this.speech.speak('Estoy procesando lo que me dijiste. Espera un momento.', { priority: 'LOW' }), PROCESSING_NOTICE_MS),
    ];
  }

  private clearWaiting(): void {
    this.waitingTimers.forEach((timer) => globalThis.clearTimeout(timer));
    this.waitingTimers = [];
  }

  private showVoiceFallback(permission: VitaliaPermissionState): void {
    if (permission === 'denied') {
      this.state.set('idle');
      this.voiceNotice.set('No tengo permiso para usar el micrófono. Puedes habilitarlo en la configuración del navegador.');
    } else if (permission === 'unavailable') {
      this.state.set('idle');
      this.voiceNotice.set('No encontré un micrófono disponible en este dispositivo.');
    } else {
      this.state.set('error');
      this.voiceNotice.set(this.audio.errorMessage() || 'No pude activar el micrófono.');
    }
  }

  protected goFamily(): void { void this.router.navigateByUrl('/senior/family'); }
  protected openAction(action: LiaAction): void {
    if (action.emergency && this.emergency.startVoiceRequest({ type: 'HELP', reason: 'Necesito ayuda', source: 'LIA' })) {
      void this.speech.speak('De acuerdo. Voy a iniciar la solicitud de ayuda. Si no la necesitas, puedes cancelarla.', { priority: 'CRITICAL' });
    }
    void this.router.navigateByUrl(action.route);
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearWaiting();
    if (this.completionTimer) globalThis.clearTimeout(this.completionTimer);
    this.audio.release();
    this.coordinator.releaseLia();
  }
}

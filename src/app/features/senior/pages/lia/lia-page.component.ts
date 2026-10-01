import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { VitaliaPermissionState } from '../../../../core/models/permission.models';
import { AudioCaptureService } from '../../../../core/services/audio-capture.service';
import { LanguageContextService } from '../../../../core/i18n/language-context.service';
import { detectLanguage } from '../../../../core/i18n/language-detector';
import { LiaLanguageCode, LocalizedText, VariantId } from '../../../../core/i18n/language.models';
import { variantInfo } from '../../../../core/i18n/language-variants';
import { MultilingualVoiceIntentMatcher } from '../../../../core/i18n/multilingual-voice-intent-matcher';
import { normalizeVoicePhrase } from '../../../../core/i18n/normalize-voice-phrase';
import { PhrasebookService } from '../../../../core/i18n/phrasebook.service';
import { LiaOutputReport, LiaOutputService } from '../../../../core/services/lia-output.service';
import { LiaSpeakOptions, LiaSpeechPriority, LiaSpeechService } from '../../../../core/services/lia-speech.service';
import { SENIOR_DEMO_PROFILE } from '../../../../core/services/senior-mock-data';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { SpeechRecognitionProvider, SpeechRecognitionRegistry } from '../../../../core/services/speech-recognition.providers';
import { VoiceDebugLogService } from '../../../../core/services/voice-debug-log.service';
import { VoiceSessionCoordinatorService } from '../../../../core/services/voice-session-coordinator.service';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { ConsentDialogComponent } from '../../../../shared/ui/consent-dialog/consent-dialog.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { BackButtonComponent } from '../../../../shared/ui/navigation/back-button.component';
import { CallContactDialogComponent } from '../../components/call-contact-dialog/call-contact-dialog.component';
import { EmergencyReason, LiaAction, LiaIntent, LiaMessage, LiaNavigation, LiaReply, LiaState, SeniorContact } from '../../models/senior.models';
import { ContactsService } from '../../services/contacts.service';
import { EmergencyService } from '../../services/emergency.service';
import { IntentLexiconService } from '../../services/intent-lexicon';
import { LiaService } from '../../services/lia.service';
import { SeniorStateService } from '../../services/senior-state.service';
import { IndigenousLanguage, IndigenousPhrase, IndigenousPhraseCategory, INDIGENOUS_PHRASES } from './indigenous-phrases';

const SPEECH_PRIORITY: Readonly<Record<LiaIntent, LiaSpeechPriority>> = {
  START_EMERGENCY: 'CRITICAL',
  CALL_FAMILY: 'HIGH', CALL_DAUGHTER: 'HIGH', OPEN_LOCATION: 'HIGH',
  NEXT_MEDICATION: 'NORMAL', MEDICATION_TAKEN: 'NORMAL', START_CHECKIN: 'NORMAL', MEMORY_ACTIVITY: 'NORMAL', PENSION_INFO: 'NORMAL',
  UNKNOWN: 'LOW',
};
/** Solo si la respuesta por voz tarda: primero "te escuché" y, si sigue tardando, "estoy procesando". */
const HEARD_NOTICE_MS = 1200;
const PROCESSING_NOTICE_MS = 4000;
/** Tiempo minimo para leer la respuesta antes de abrir la pantalla (tambien con la voz desactivada). */
const OPEN_SCREEN_MIN_MS = 1500;
const PILOT_LANGUAGES: readonly LiaLanguageCode[] = ['nahuatl-pilot', 'zapoteco-pilot'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, BackButtonComponent, CallContactDialogComponent, ConsentDialogComponent, FormsModule, VitaliaIconComponent],
  selector: 'app-lia-page',
  template: `
    <section class="lia-page">
      <app-back-button parentRoute="/senior" />
      <section class="chat-shell" aria-label="Chat con LIA">
        <header class="chat-header">
          <div class="lia-avatar" [class.lia-avatar--active]="active" [class.lia-avatar--listening]="recording" aria-hidden="true">
            <span class="lia-avatar__ring"></span><span class="lia-avatar__core"><app-vitalia-icon [name]="recording ? 'microphone' : 'sparkles'" [size]="24" /></span>
          </div>
          <div class="chat-header__identity">
            <h1>LIA</h1>
            <p role="status"><span class="status-dot" [class.status-dot--busy]="busy"></span>{{ statusLabel === 'Lista' ? 'Lista para ayudarte' : statusLabel }}</p>
          </div>
        </header>

        <div class="privacy-strip"><app-vitalia-icon name="shield" [size]="17" /><span>No vigilamos, acompañamos. Tu voz se convierte en texto y no se guarda.</span></div>
        @if (canSwitchLanguage()) {
          <div class="language-row"><span>{{ languageLabel() }}</span><button type="button" [disabled]="busy" (click)="switchLanguage()">{{ switchLanguageLabel() }}</button></div>
        }
        @if (state() === 'listening') {
          <p class="mic-live" role="status"><span class="mic-live__dot" aria-hidden="true"></span><strong>Te escucho</strong><span>Pulsa el micrófono cuando termines.</span></p>
        }

        <section class="conversation" aria-label="Conversación con LIA" aria-live="polite">
          <time class="conversation-date">Hoy, {{ currentTime }}</time>
          @for (message of messages(); track message.id) {
            <article class="message-row" [class.message-row--user]="message.sender === 'user'">
              @if (message.sender === 'lia') { <span class="message-avatar" aria-hidden="true"><app-vitalia-icon name="sparkles" [size]="17" /></span> }
              <div class="message" [class.message--user]="message.sender === 'user'" [class.message--lia]="message.sender === 'lia'">
                <p>{{ message.text }}</p>
                @if (message.viaVoice) { <span class="via-voice"><app-vitalia-icon name="microphone" [size]="14" /> Mensaje por voz</span> }
                @if (message.intent === 'NEXT_MEDICATION' && nextMedication(); as medication) {
                  <div class="medication-inline">
                    <app-vitalia-icon name="pill" [size]="23" />
                    <span><strong>{{ medication.name }}</strong><small>{{ medication.dose }}</small></span>
                    @if (medication.status !== 'TAKEN') { <button type="button" (click)="takeMedication(medication.id)">Ya la tomé</button> }
                  </div>
                }
                @if (message.spanishTranslation) { <small class="spanish-translation">{{ message.spanishTranslation }}</small> }
                @if (message.translationPending || message.pilotText) { <small class="translation-note">{{ pendingNote(message) }}</small> }
                @if (message.confirmation) { <span class="confirmation"><app-vitalia-icon name="check" [size]="18" /> Acción guardada</span> }
                @if (message.action; as action) { <app-button icon="chevron-right" [variant]="action.emergency ? 'emergency' : 'secondary'" (pressed)="openAction(action)">{{ action.label }}</app-button> }
              </div>
            </article>
          }
          @if (voiceNotice()) {
            <article class="message-row"><span class="message-avatar" aria-hidden="true"><app-vitalia-icon name="sparkles" [size]="17" /></span><p class="voice-notice" role="status"><app-vitalia-icon name="microphone" [size]="16" />{{ voiceNotice() }} Puedes repetirlo o escribir.</p></article>
          }
          @if (state() === 'processing') { <article class="message-row"><span class="message-avatar" aria-hidden="true"><app-vitalia-icon name="sparkles" [size]="17" /></span><div class="message message--lia typing" role="status"><span></span><span></span><span></span><span class="sr-only">{{ transcribing() ? 'LIA está procesando tu voz' : 'LIA está pensando' }}</span></div></article> }
        </section>

        <section class="phrasebook" aria-labelledby="phrasebook-title">
          <div class="phrasebook__heading">
            <div><p class="eyebrow">Guía de voz</p><h2 id="phrasebook-title">Frases en lenguas originarias</h2></div>
          </div>
          <p class="phrasebook__intro">Consulta frases de apoyo en náhuatl y zapoteco.</p>
          <div class="phrasebook__filters" aria-label="Filtros de frases">
            <div class="filter-group" role="group" aria-label="Lengua">
              <button type="button" [class.filter-active]="phraseLanguage() === 'nahuatl'" (click)="setPhraseLanguage('nahuatl')">Náhuatl</button>
              <button type="button" [class.filter-active]="phraseLanguage() === 'zapoteco'" (click)="setPhraseLanguage('zapoteco')">Zapoteco</button>
            </div>
            <label class="category-filter">Tema
              <select [value]="phraseCategory()" (change)="setPhraseCategory($any($event.target).value)">
                <option value="all">Todas</option>
                <option value="greeting">Saludos</option>
                <option value="help">Ayuda</option>
                <option value="medication">Medicamentos</option>
                <option value="family">Familia</option>
              </select>
            </label>
          </div>
          <div class="phrase-list">
            @for (phrase of visiblePhrases(); track phrase.id) {
              <article class="phrase-item">
                <div class="phrase-item__copy">
                  <strong>{{ phraseText(phrase) }}</strong>
                  <span>{{ phrase.spanish }}</span>
                </div>
                <button type="button" class="phrase-send" [disabled]="busy" title="Enviar frase a LIA" aria-label="Enviar frase a LIA" (click)="sendPhrase(phrase)">
                  <app-vitalia-icon name="send" [size]="18" />
                </button>
                <button type="button" class="phrase-audio" [class.phrase-audio--playing]="activePhraseAudio() === phrase.id" [disabled]="!phrase.audio[phraseLanguage()] && !speechSupported" [attr.title]="phrase.audio[phraseLanguage()] ? 'Escuchar grabación' : 'Escuchar con texto a voz'" [attr.aria-label]="phrase.audio[phraseLanguage()] ? 'Escuchar grabación' : 'Escuchar con texto a voz'" (click)="playPhrase(phrase)">
                  <app-vitalia-icon name="play" [size]="20" />
                </button>
              </article>
            } @empty {
              <p class="phrase-empty">No hay frases para este filtro.</p>
            }
          </div>
          @if (hiddenCount() > 0 || phrasebookExpanded()) {
            <button type="button" class="phrasebook__accordion-btn" [attr.aria-expanded]="phrasebookExpanded()" (click)="togglePhrasebook()">
              @if (phrasebookExpanded()) {
                <app-vitalia-icon name="chevron-right" [size]="16" class="icon-up" />
                <span>Ver menos</span>
              } @else {
                <span>Ver {{ hiddenCount() }} frases más</span>
                <app-vitalia-icon name="chevron-right" [size]="16" class="icon-down" />
              }
            </button>
          }
          <p class="phrasebook__note"><app-vitalia-icon name="shield" [size]="15" /> Las frases usan el motor de texto a voz disponible en tu dispositivo.</p>
        </section>

        <section class="quick-prompts" aria-labelledby="quick-prompts-title"><h2 id="quick-prompts-title">Puedes preguntarme…</h2><div class="quick-grid">
          @for (prompt of quickPrompts(); track prompt) { <button type="button" [disabled]="busy" (click)="sendQuick(prompt)">{{ prompt }}</button> }
        </div></section>

        <form class="composer" (ngSubmit)="sendDraft()">
          <label class="sr-only" for="lia-message">Escribe un mensaje para LIA</label>
          <input id="lia-message" name="message" [(ngModel)]="draft" [disabled]="busy" placeholder="Escribe aquí…" autocomplete="off" />
          <button class="composer__send" type="submit" [disabled]="!draft.trim() || busy" aria-label="Enviar mensaje"><app-vitalia-icon name="send" [size]="22" /></button>
          <button class="composer__mic" type="button" [class.composer__mic--recording]="recording" [disabled]="voiceDisabled" (click)="toggleVoice()" [attr.aria-label]="recording ? 'Detener grabación' : 'Hablar con LIA'"><app-vitalia-icon [name]="recording ? 'close' : 'microphone'" [size]="27" /></button>
        </form>
      </section>

      <app-consent-dialog [open]="consentOpen()" icon="microphone" heading="¿Permites que VITALIA use tu micrófono?"
        description="LIA utiliza el micrófono cuando decides hablar con ella. No se activa de forma permanente."
        note="También puedes escribir tus mensajes." confirmLabel="Permitir micrófono" dismissLabel="Ahora no"
        (confirmed)="acceptMicrophone()" (dismissed)="declineMicrophone()" />
      <app-call-contact-dialog [open]="!!callContact()" [contact]="callContact()" (called)="announceCall($event)" (closed)="callContact.set(null)" />
    </section>
  `,
  styleUrl: './lia-page.component.scss',
})
export class LiaPageComponent implements OnDestroy {
  private readonly lia = inject(LiaService);
  private readonly seniorState = inject(SeniorStateService);
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionsService);
  private readonly audio = inject(AudioCaptureService);
  private readonly coordinator = inject(VoiceSessionCoordinatorService);
  private readonly emergency = inject(EmergencyService);
  private readonly output = inject(LiaOutputService);
  private readonly phrases = inject(PhrasebookService);
  private readonly language = inject(LanguageContextService);
  private readonly recognition = inject(SpeechRecognitionRegistry);
  private readonly lexicons = inject(IntentLexiconService);
  private readonly matcher = inject(MultilingualVoiceIntentMatcher);
  private readonly contacts = inject(ContactsService);
  private readonly speech = inject(LiaSpeechService);
  private readonly debug = inject(VoiceDebugLogService);
  protected readonly nextMedication = this.seniorState.nextMedication;
  protected readonly currentTime = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(new Date());
  /** Proveedor que esta grabando: la transcripcion sale en su lengua. */
  private activeProvider: SpeechRecognitionProvider | null = null;
  protected readonly transcribing = signal(false);
  private completionTimer?: number;
  private waitingTimers: ReturnType<typeof setTimeout>[] = [];
  /** Invalida la apertura de pantalla pendiente si la persona sigue hablando o envia otro mensaje. */
  private replyToken = 0;
  private destroyed = false;
  /** `requesting` y `stopped` son estados exclusivos de la entrada por voz. */
  protected readonly state = signal<LiaState | 'requesting' | 'stopped'>('idle');
  /** Cuando es true, el próximo mensaje de texto/voz se interpreta como razón de emergencia. */
  private readonly awaitingEmergencyReason = signal(false);
  protected readonly consentOpen = signal(false);
  protected readonly voiceNotice = signal('');
  /** Contacto de la confirmacion de llamada abierta desde una respuesta ("Llamar a Ana"). */
  protected readonly callContact = signal<SeniorContact | null>(null);
  protected readonly messages = signal<readonly LiaMessage[]>([
    this.liaMessage('lia-welcome', this.phrases.t('lia.welcome', { name: SENIOR_DEMO_PROFILE.preferredName })),
  ]);
  /** Lengua de la conversacion, siempre visible (y si es un piloto, se indica). */
  protected readonly languageLabel = computed(() => {
    const info = variantInfo(this.language.interactionVariant());
    return `${info.label}${info.tts === 'none' ? ' · respuestas en texto' : ''}`;
  });
  protected readonly canSwitchLanguage = computed(() => this.language.liaLanguage() !== 'es' || this.language.interactionVariant() !== 'es');
  /** Desde espanol se vuelve al idioma elegido en Accesibilidad; desde un piloto, a espanol. */
  private readonly switchTarget = computed<LiaLanguageCode>(() => (this.language.interactionVariant() === 'es' ? this.language.liaLanguage() : 'es'));
  protected readonly switchLanguageLabel = computed(() => `Cambiar a ${variantInfo(this.switchTarget()).shortLabel.toLowerCase()}`);
  protected readonly phraseLanguage = signal<IndigenousLanguage>('nahuatl');
  protected readonly phraseCategory = signal<IndigenousPhraseCategory | 'all'>('all');
  protected readonly activePhraseAudio = signal<string | null>(null);
  protected readonly speechSupported = this.speech.supported;
  protected readonly phrasebookExpanded = signal(false);
  protected readonly filteredPhrases = computed(() => INDIGENOUS_PHRASES.filter((phrase) => this.phraseCategory() === 'all' || phrase.category === this.phraseCategory()));
  protected readonly visiblePhrases = computed(() => { const all = this.filteredPhrases(); return this.phrasebookExpanded() ? all : all.slice(0, 3); });
  protected readonly hiddenCount = computed(() => Math.max(0, this.filteredPhrases().length - 3));
  protected readonly quickPrompts = computed(() => {
    const variant = this.language.interactionVariant();
    if (variant === 'nahuatl-pilot' || variant === 'zapoteco-pilot') {
      const language = variant === 'nahuatl-pilot' ? 'nahuatl' : 'zapoteco';
      return INDIGENOUS_PHRASES.filter((phrase) => phrase.category !== 'greeting').map((phrase) => phrase[language].text);
    }
    return [
      '¿Qué medicamento me toca?', '¿Cuándo depositan mi pensión?', 'Muéstrame ejercicios de memoria',
      'Quiero hablar con mi hija', 'Necesito ayuda', 'Ya me tomé mi medicamento',
    ];
  });
  protected draft = '';

  protected get busy(): boolean { return ['requesting', 'listening', 'processing', 'speaking'].includes(this.state()); }
  protected get active(): boolean { return !['idle', 'completed', 'stopped', 'error'].includes(this.state()); }
  protected get recording(): boolean { return this.state() === 'listening' || this.state() === 'requesting'; }
  protected get voiceDisabled(): boolean { return this.state() === 'processing' || this.state() === 'speaking'; }
  protected get statusLabel(): string { return { idle: 'Lista', requesting: 'Solicitando permiso', listening: 'Escuchando', stopped: 'Detenido', processing: 'Procesando', speaking: 'Respondiendo', completed: 'Completado', error: 'Error' }[this.state()]; }

  protected sendDraft(): void {
    const message = this.draft.trim();
    if (!message) return;
    this.draft = '';
    this.send(message);
  }

  /**
   * Mensaje escrito o transcrito. La respuesta sale en la lengua de la entrada: por voz, la del proveedor que
   * transcribio; por escrito, la que decide `LanguageContextService` (detectar solo con confianza alta).
   */
  protected send(prompt: string, viaVoice = false, inputVariant?: VariantId): void {
    if (this.busy) return;
    if (this.awaitingEmergencyReason()) {
      this.handleEmergencyReasonInput(prompt, viaVoice, inputVariant);
      return;
    }
    const switchTo = this.languageSwitchRequest(prompt);
    if (switchTo) {
      this.pushUser(prompt, viaVoice, inputVariant ?? 'es');
      this.applyLanguageSwitch(switchTo);
      this.coordinator.releaseLia();
      return;
    }
    // Por escrito, una frase predeterminada de un piloto (o espanol claro) puede cambiar la conversacion.
    const variant = inputVariant ?? this.language.resolveTextInput(detectLanguage(prompt, this.matcher.matchAny(prompt, PILOT_LANGUAGES))).variant;
    const resolution = this.lia.resolve(prompt, variant);
    this.debug.log({
      language: variant, heard: prompt, normalized: normalizeVoicePhrase(prompt, { stripWakeWord: true }),
      candidate: resolution.intent, confidence: resolution.confidence, action: resolution.intent === 'UNKNOWN' ? 'ninguna' : resolution.intent,
    });
    if (resolution.intent === 'START_EMERGENCY') {
      this.startVoiceEmergencyFlow(prompt, viaVoice, variant);
      return;
    }
    this.converse(prompt, variant, this.lia.respondToIntent(resolution.intent, resolution.variant), viaVoice);
  }

  /**
   * Inicia el flujo de emergencia guiado por voz: LIA pregunta "¿Qué sucede?" y activa el micrófono.
   * El siguiente input (escrito o de voz) se interpreta como razón de emergencia.
   */
  private startVoiceEmergencyFlow(prompt: string, viaVoice: boolean, variant: VariantId): void {
    this.pushUser(prompt, viaVoice, variant);
    this.awaitingEmergencyReason.set(true);
    const askMsg = this.phrases.t('lia.emergency.askReason' as any);
    this.pushLia(`lia-emergency-ask-${Date.now()}`, askMsg, 'CRITICAL');
    // Activa el micrófono automáticamente después de que LIA termine de hablar.
    globalThis.setTimeout(() => { void this.startVoice(); }, 1800);
  }

  /** Procesa la respuesta del usuario a "¿Qué sucede?" y lanza la emergencia con la razón detectada. */
  private handleEmergencyReasonInput(prompt: string, viaVoice: boolean, inputVariant?: VariantId): void {
    this.awaitingEmergencyReason.set(false);
    const variant = inputVariant ?? this.language.interactionVariant();
    const reason = this.detectEmergencyReason(prompt);
    this.pushUser(prompt, viaVoice, variant);
    if (!reason) {
      const notHeardMsg = this.phrases.t('lia.emergency.reasonNotHeard' as any);
      this.pushLia(`lia-emergency-nohear-${Date.now()}`, notHeardMsg, 'HIGH');
      // Da otra oportunidad: vuelve a esperar razón y reactiva el micrófono.
      this.awaitingEmergencyReason.set(true);
      globalThis.setTimeout(() => { void this.startVoice(); }, 1600);
      return;
    }
    const keyMap: Record<EmergencyReason, string> = {
      'Me caí': 'lia.emergency.reasonFall',
      'Me siento mal': 'lia.emergency.reasonSick',
      'Estoy mareada': 'lia.emergency.reasonDizzy',
      'Otra emergencia': 'lia.emergency.reasonOther',
      'Necesito ayuda': 'lia.emergency.reasonOther',
    };
    const confirmMsg = this.phrases.t(keyMap[reason] as any);
    this.pushLia(`lia-emergency-confirm-${Date.now()}`, confirmMsg, 'CRITICAL');
    // Lanza el flujo de emergencia por voz y navega a la pantalla para que pueda cancelar o ver el progreso.
    globalThis.setTimeout(() => {
      this.emergency.startVoiceRequest({ type: this.reasonToType(reason), reason, source: 'LIA' });
      void this.router.navigateByUrl('/senior/emergency');
    }, 2200);
  }

  private detectEmergencyReason(text: string): EmergencyReason | null {
    const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/ca(i|y)(d|s)?|cai/.test(t)) return 'Me caí';
    if (/mal|enferm|duele|dolor|no (me siento|puedo)/.test(t)) return 'Me siento mal';
    if (/mare(a|o|ad)/.test(t)) return 'Estoy mareada';
    if (/ayuda|emergencia|auxilio|urg/.test(t)) return 'Otra emergencia';
    return null;
  }

  private reasonToType(reason: EmergencyReason) {
    const map: Record<EmergencyReason, 'FALL' | 'SICK' | 'DIZZY' | 'OTHER' | 'HELP'> = {
      'Me caí': 'FALL', 'Me siento mal': 'SICK', 'Estoy mareada': 'DIZZY',
      'Otra emergencia': 'OTHER', 'Necesito ayuda': 'HELP',
    };
    return map[reason];
  }

  /** Las preguntas sugeridas son atajos de intencion: no cambian el idioma; LIA responde en el de la conversacion. */
  protected sendQuick(prompt: string): void {
    if (this.busy) return;
    const variant = this.language.interactionVariant();
    this.converse(prompt, variant, this.lia.respondToIntent(this.lia.resolveIntent(prompt, variant), variant), false);
  }

  protected setPhraseLanguage(language: IndigenousLanguage): void { this.phraseLanguage.set(language); this.phrasebookExpanded.set(false); }

  protected setPhraseCategory(category: IndigenousPhraseCategory | 'all'): void { this.phraseCategory.set(category); this.phrasebookExpanded.set(false); }

  protected togglePhrasebook(): void { this.phrasebookExpanded.update(v => !v); }

  protected phraseText(phrase: IndigenousPhrase): string { return phrase[this.phraseLanguage()].text; }

  protected sendPhrase(phrase: IndigenousPhrase): void {
    const variant: LiaLanguageCode = this.phraseLanguage() === 'nahuatl' ? 'nahuatl-pilot' : 'zapoteco-pilot';
    const text = this.phraseText(phrase);
    const resolution = this.lia.resolve(text, variant);
    if (resolution.intent !== 'UNKNOWN') {
      this.send(text, false, variant);
      return;
    }
    const { text: responseText, translation } = this.phraseResponse(phrase, variant);
    const message: LocalizedText = { key: 'lia.welcome', variant, text: responseText, available: true, fallbackText: null, nativeValidation: false };
    const reply: LiaReply = { intent: 'UNKNOWN', text: responseText, message, spanishTranslation: translation };
    this.converse(text, variant, of(reply), false);
  }

  private phraseResponse(phrase: IndigenousPhrase, variant: LiaLanguageCode): { text: string; translation: string } {
    const isNahuatl = variant === 'nahuatl-pilot';
    type Pair = { text: string; translation: string };
    const pools: Record<IndigenousPhraseCategory, { nahuatl: Pair[]; zapoteco: Pair[] }> = {
      greeting: {
        nahuatl: [
          { text: '¡Cualli tonatiuh, María! Nimitztlajpaloa. ¿Kenijkatsa timoyollia axkan?', translation: '¡Buenos días, María! Te saludo. ¿Cómo te sientes hoy?' },
          { text: 'Nimitztlajpaloa itzel. ¡Cualli monemilis! ¿Tlen ticneki axkan?', translation: 'Te saludo también. ¡Que tengas buen día! ¿Qué necesitas hoy?' },
          { text: 'Niccahuiloz mochpan, María. ¿Tla ticneki tochanchihualis?', translation: 'Aquí estoy siempre para ti, María. ¿Quieres que revisemos tus pendientes?' },
          { text: '¡Nimitztlajpaloa! Axkan nimitzcactoc. ¿Tlen nicchihuaz para mitz?', translation: '¡Te saludo! Aquí te escucho. ¿En qué puedo ayudarte?' },
        ],
        zapoteco: [
          { text: "¡Bidxi sti', María! Binadiaʼgaʼ lii. ¿Xi modo cayuneʼ sentir viteza?", translation: '¡Buenos días, María! Aquí estoy. ¿Cómo te sientes ahora?' },
          { text: "¡Xhozelú, María! Raquiiñeʼ gucaaʼ gacanécabe lii. ¿Xi racaladxeʼ?", translation: '¡Hola, María! Quiero ayudarte. ¿Qué necesitas?' },
          { text: "Binadiaʼgaʼ lii. Guirá luguiʼ raquiiñeʼ gucaaʼ lii. ¿Xi ndaaʼ viteza?", translation: 'Aquí estoy. Siempre quiero ayudarte. ¿Qué pasa ahora?' },
          { text: "¡Bidxaagalú, María! ¿Paraa nuaaʼ yaʼ viteza? Raquiiñeʼ gacanécabe lii.", translation: '¡Bienvenida, María! ¿Cómo estás ahora? Quiero acompañarte.' },
        ],
      },
      help: {
        nahuatl: [
          { text: 'Nimitzcactoc. ¿Tlen tlapaleuilistli ticneki — tlaijiyohuilistli, moichpoca, o sekin?', translation: 'Aquí te escucho. ¿Qué tipo de ayuda necesitas: emergencia, tu familia, u otra cosa?' },
          { text: 'Niccahuiloz mochpan. ¿Ticneki nicchihuas tlatzotzontilis pampa moichpoca?', translation: 'Aquí estoy siempre. ¿Quieres que llame a tu hija?' },
          { text: 'Nimitztlapaleuia. ¿Tla ticneki nitlaijtos pampa mitz tlapaleuij?', translation: 'Te ayudo. ¿Necesitas que avise a alguien para que te apoye?' },
          { text: 'Xikijkui moseiyo — nimitztlapaleuia. ¿Kemman ticneki nitictlaxtlahuis?', translation: 'Respira tranquila — te ayudo. ¿Cuándo necesitas que te apoye?' },
        ],
        zapoteco: [
          { text: "Binadiaʼgaʼ lii. ¿Xi modo racaladxeʼ gacanécabe — emergencia, xiiñidxaapaʼ, u runi?", translation: 'Aquí estoy. ¿Qué tipo de ayuda necesitas: emergencia, tu familia, u otra cosa?' },
          { text: "Raquiiñeʼ gacanécabe lii. ¿Racaladxeʼ gucaaʼ ridxi xiiñidxaapaʼ Ana?", translation: 'Quiero ayudarte. ¿Quieres llamar a tu hija Ana?' },
          { text: "Binadiaʼgaʼ lii, María. ¿Xi cayuneʼ bisaanaʼ viteza? Raquiiñeʼ gucaaʼ ndaaʼ.", translation: 'Aquí estoy, María. ¿Qué te preocupa ahora? Quiero saber.' },
          { text: "Guirá luguiʼ raquiiñeʼ gacanécabe lii. ¿Xi ndaaʼ xi racaladxeʼ gunapaʼ?", translation: 'Siempre quiero acompañarte. ¿Qué necesitas ahora?' },
        ],
      },
      medication: {
        nahuatl: [
          { text: 'Nimitzcactoc. Axkan moneki tiktekiuijtok Metformina — 500 mg itzel amoxtli.', translation: 'Te escucho. Ahora debes tomar Metformina: 500 mg con alimentos.' },
          { text: 'Ninextis mopahme: axkan mocuepas Vitamina D ica 2 horas. ¿Ticneki nicmomachtis?', translation: 'Te muestro tus medicamentos: Vitamina D te toca en 2 horas. ¿Quieres que te recuerde?' },
          { text: '¿Tikuijki mopah? Cualli. Niquittas mopahme — axkan amo cana timociahuas.', translation: '¿Ya tomaste tu medicamento? Bien. Revisaré tu plan: no te falta nada por ahora.' },
          { text: 'Momechuh pajtli ticneki — Metformina ica ixquich tlamantli. ¿Tikijtoa ya tikuijki?', translation: 'Tu próximo medicamento es Metformina con alimentos. ¿Dices que ya lo tomaste?' },
        ],
        zapoteco: [
          { text: "Binadiaʼgaʼ lii. Viteza racaladxeʼ guicaaʼ Metformina — 500 mg ne ca alimento.", translation: 'Aquí estoy. Ahora debes tomar Metformina: 500 mg con alimentos.' },
          { text: "Maʼ biiñiʼ ca medicina stinneʼ: Vitamina D racaladxeʼ guicaaʼ yaʼ ora ndaaniʼ. ¿Racaladxeʼ gacanécabe?", translation: 'Aquí están tus medicamentos: Vitamina D te toca más tarde. ¿Quieres que te acompañe?' },
          { text: "¿Maʼ bidxelaʼ ca medicina? Bitoope. Raquiiñeʼ ganapaʼ ca que guiree viteza.", translation: '¿Ya tomaste tu medicamento? Muy bien. Revisaré tu plan para ahora.' },
          { text: "Ca medicina stinneʼ ndaaniʼ — Metformina ne ca alimento. ¿Bidxelaʼ maʼ?", translation: 'Tu medicamento de ahora es Metformina con alimentos. ¿Ya lo tomaste?' },
        ],
      },
      family: {
        nahuatl: [
          { text: 'Nimitzcactoc. ¿Ticneki niquinnotztok Ana o Luis axkan?', translation: 'Te escucho. ¿Quieres que llame a Ana o a Luis ahora?' },
          { text: 'Niccahuiloz mochpan. Ana ya terminó su llamada — ¿le mandamos un mensaje?', translation: 'Aquí estoy siempre. Ana acaba de terminar su llamada: ¿le enviamos un mensaje?' },
          { text: 'Moichpoca Ana omotlacahualti. ¿Ticneki nicmitztlailis nopa sekin tlatzotzontilis?', translation: 'Tu hija Ana está disponible. ¿Quieres que le marque?' },
          { text: 'Nijneki nijnextis moichpoca. ¿Axkan moneki nitlatzotzona?', translation: 'Quiero conectarte con tu hija. ¿Necesito llamarle ahora?' },
        ],
        zapoteco: [
          { text: "Binadiaʼgaʼ lii. ¿Racaladxeʼ gucaaʼ ridxi Ana u Luis viteza?", translation: 'Aquí estoy. ¿Quieres llamar a Ana o a Luis ahora?' },
          { text: "Raquiiñeʼ gacanécabe lii. Ana runiʼ disponible — ¿racaladxeʼ gucaaʼ mensaje?", translation: 'Quiero ayudarte. Ana está disponible: ¿quieres enviarle un mensaje?' },
          { text: "Xiiñidxaapaʼ Ana bitiʼ ristopaaʼ viteza. ¿Racaladxeʼ gucaaʼ ridxi Luis?", translation: 'Tu hija Ana no está ocupada ahora. ¿Quieres llamar a Luis?' },
          { text: "Raquiiñeʼ gucaaʼ ridxi xiiñidxaapaʼ. ¿Guirú viteza u ora ndaaniʼ?", translation: 'Quiero llamar a tu hija. ¿Ahora mismo o más tarde?' },
        ],
      },
      confirmation: {
        nahuatl: [
          { text: 'Kema. Nijpiilos tein timechijki. Ixpantik, María.', translation: 'Sí. Guardaré lo que me dijiste. Listo, María.' },
          { text: 'Nijmati. Axkan niquittas nopa. ¿Tlen okseki ticneki?', translation: 'Entendido. Ahora lo registro. ¿Qué más necesitas?' },
          { text: 'Cualli. Nijchijtok tein timitztlanilili. ¿Tla ticneki sekin tlapaleuilistli?', translation: 'Bien. Hice lo que me pediste. ¿Necesitas otro tipo de ayuda?' },
          { text: 'Kema, nitlacaqui. Nijchijtok. ¿Ticneki nochintin ixpantik?', translation: 'Sí, escuché. Ya está hecho. ¿Quieres que revisemos todo?' },
        ],
        zapoteco: [
          { text: "De acuerdo. Maʼ biiñiʼ ndaaʼ xi bidxelaʼ. Guirá listo, María.", translation: 'De acuerdo. Ya quedó lo que pediste. Todo listo, María.' },
          { text: "Confirmar. Maʼ biiñiʼ ndaaʼ. ¿Xi ndaaʼ xi racaladxeʼ viteza?", translation: 'Confirmado. Ya está guardado. ¿Qué más necesitas ahora?' },
          { text: "Cualli. Maʼ gucaaʼ ndaaʼ xi bidxelaʼ. ¿Racaladxeʼ runi ndaaniʼ?", translation: 'Bien. Ya quedó lo que pediste. ¿Quieres hacer algo más?' },
          { text: "Listo. Maʼ biiñiʼ. ¿Guirá bien u racaladxeʼ gucaaʼ runi ndaaniʼ?", translation: 'Listo. Ya está. ¿Todo bien o quieres hacer algo más?' },
        ],
      },
      cancellation: {
        nahuatl: [
          { text: 'Amo moselos. ¿Tlen okseki ticneki axkan?', translation: 'No te preocupes. ¿Qué más necesitas ahora?' },
          { text: 'Cualli, niccahuiloz. ¿Tlen nicchihuaz para mitz?', translation: 'Está bien, aquí estoy. ¿Qué puedo hacer por ti?' },
          { text: 'Nijmati — niquittas sekin. ¿Kenijkatsa nicmitzpaleuijtok?', translation: 'Entendido — buscaré otra opción. ¿Cómo puedo ayudarte?' },
          { text: 'Amo problema. Axcan nimochihua okseki. ¿Ticneki?', translation: 'Sin problema. Ahora busco otra cosa. ¿Qué necesitas?' },
        ],
        zapoteco: [
          { text: "Coʼ problema. ¿Xi ndaaʼ xi racaladxeʼ viteza?", translation: 'Sin problema. ¿Qué necesitas ahora?' },
          { text: "De acuerdo, coʼ bisaana. ¿Xi racaladxeʼ gucaaʼ ndaaʼ?", translation: 'De acuerdo, sin problema. ¿Qué quieres hacer ahora?' },
          { text: "Listo — guzaaʼ. ¿Ximodo racaladxeʼ gacanécabe lii?", translation: 'Listo — cancelado. ¿En qué quieres que te acompañe?' },
          { text: "Coʼ problema, María. ¿Racaladxeʼ gucaaʼ runi ndaaniʼ?", translation: 'Sin problema, María. ¿Quieres hacer algo más?' },
        ],
      },
      emergency: {
        nahuatl: [
          { text: 'Nimitztlapaleuia. Xikijkui moseiyo — axkan niquinnotztok Ana.', translation: 'Te ayudo. Respira tranquila — ahora llamo a Ana.' },
          { text: 'Axcan nicmitzpaleuijtok. ¿Ticneki nicmitzneittilis tlapaleuilistli?', translation: 'Ahora te apoyo. ¿Quieres que abra la pantalla de emergencias?' },
          { text: 'Nimitzcactoc. Axcan nicmixquechilia tlapaleuilistli tlen tlaijiyohuilistli.', translation: 'Te escucho. Ahora activo el servicio de emergencias.' },
          { text: 'Xikijkui moseiyo, María — nimitztlapaleuia. ¿Ticneki nicnotztok moteotajtzi?', translation: 'Respira, María — te ayudo. ¿Necesitas que llame a tu médico?' },
        ],
        zapoteco: [
          { text: "Bitiʼ guzaaʼ, María. Raquiiñeʼ gacanécabe lii — raquiiñeʼ gucaaʼ ridxi Ana.", translation: 'No te vayas, María. Quiero acompañarte — voy a llamar a Ana.' },
          { text: "Binadiaʼgaʼ lii. Raquiiñeʼ ganapaʼ ca serviciu de emergencia viteza.", translation: 'Aquí estoy. Quiero abrir el servicio de emergencias ahora.' },
          { text: "Bitiʼ guzaaʼ — raquiiñeʼ gacanécabe lii. ¿Racaladxeʼ gucaaʼ ridxi ca que runeʼ ayudarte?", translation: 'No te muevas — quiero acompañarte. ¿Quieres llamar a quien puede ayudarte?' },
          { text: "Raquiiñeʼ gacanécabe lii, María. Binadiaʼgaʼ lii siempre.", translation: 'Quiero estar contigo, María. Aquí estoy siempre.' },
        ],
      },
      location: {
        nahuatl: [
          { text: 'Nimitzcactoc. Ninextis tokniuh nochipa mopan. Xikijkui moseiyo.', translation: 'Te escucho. Te mostraré dónde estás en el mapa. Respira tranquila.' },
          { text: 'Niquittas monochiyaliztli — mopan itzel mapa. ¿Ticneki nicmitzneittilis?', translation: 'Revisaré tu ubicación — estás marcada en el mapa. ¿Quieres que te la muestre?' },
          { text: 'Ninextis monemilis — axkan timopixcatoc itzel tonali itzel altepetl.', translation: 'Te mostraré dónde estás: hoy estás ubicada en la colonia registrada.' },
          { text: 'Monochiyaliztli panotoc cualli. Axcan mopan nelia. ¿Ticneki okseki?', translation: 'Tu ubicación está bien registrada. Ahora sí estás localizada. ¿Necesitas algo más?' },
        ],
        zapoteco: [
          { text: "Binadiaʼgaʼ lii. Raquiiñeʼ ganapaʼ paraa nuaaʼ yaʼ viteza.", translation: 'Aquí estoy. Quiero mostrarte dónde estás ahora.' },
          { text: "Maʼ biiñiʼ ndaaʼ paraa nuaaʼ — raquiiñeʼ gucaaʼ mapa viteza.", translation: 'Ya sé dónde estás — quiero abrir el mapa ahora.' },
          { text: "Raquiiñeʼ ganapaʼ luguiʼ nuaaʼ yaʼ. ¿Racaladxeʼ gucaaʼ ridxi Ana ndaaʼ?", translation: 'Quiero saber dónde estás. ¿Quieres que le diga tu ubicación a Ana?' },
          { text: "Binadiaʼgaʼ lii, María. Maʼ biiñiʼ paraa nuaaʼ. ¿Guirá bien?", translation: 'Aquí estoy, María. Ya sé dónde estás. ¿Todo bien?' },
        ],
      },
      checkin: {
        nahuatl: [
          { text: 'Nimitzcactoc. Xijualica — axkan titocnopiltijtok tocheckin tlen tonali.', translation: 'Te escucho. Ven conmigo — vamos a hacer el check-in de hoy.' },
          { text: '¿Kenijkatsa timoyollia axkan? Cualli, niquittas monemilis.', translation: '¿Cómo te sientes hoy? Bien, voy a registrar cómo estás.' },
          { text: 'Ticneki tijtlajkuilos — ¡cualli! Axcan titocnopiltijtok tocheckin.', translation: 'Quieres registrar cómo estás: ¡muy bien! Vamos a hacer el check-in.' },
          { text: 'Ticneki nicmitzmachiltis kenijkatsa timoyollia. ¿Cualli, axqui, o ixnextik?', translation: 'Quiero saber cómo te sientes. ¿Bien, más o menos, o preocupada?' },
        ],
        zapoteco: [
          { text: "Binadiaʼgaʼ lii. Bidxi guiñelú — raquiiñeʼ gucaaʼ ximodo cayuneʼ sentir viteza.", translation: 'Aquí estoy. Ven conmigo — quiero saber cómo te sientes hoy.' },
          { text: "¿Xi modo cayuneʼ sentir viteza? Bitoope — raquiiñeʼ ganapaʼ ndaaʼ.", translation: '¿Cómo te sientes ahora? Muy bien — quiero registrar eso.' },
          { text: "Racaladxeʼ gucaaʼ ndaaʼ ximodo cayuneʼ. ¡Cualli! Raquiiñeʼ gucaaʼ checkin.", translation: 'Quieres registrar cómo estás. ¡Bien! Vamos a hacer el check-in.' },
          { text: "¿Cayuneʼ sentir bien, regular u bisaana? Binadiaʼgaʼ lii — raquiiñeʼ gacanécabe lii.", translation: '¿Te sientes bien, regular o preocupada? Aquí estoy — quiero acompañarte.' },
        ],
      },
    };
    const pool = pools[phrase.category];
    const list = isNahuatl ? pool.nahuatl : pool.zapoteco;
    return list[Math.floor(Math.random() * list.length)];
  }

  protected playPhrase(phrase: IndigenousPhrase): void {
    const source = phrase.audio[this.phraseLanguage()];
    this.activePhraseAudio.set(phrase.id);
    if (source) {
      const audio = new Audio(source);
      audio.addEventListener('ended', () => this.activePhraseAudio.set(null), { once: true });
      audio.addEventListener('error', () => this.activePhraseAudio.set(null), { once: true });
      void audio.play().catch(() => this.activePhraseAudio.set(null));
      return;
    }
    const options: LiaSpeakOptions = { priority: 'LOW', lang: this.phraseLanguage() === 'nahuatl' ? 'nah' : 'zap' };
    void this.speech.speak(this.phraseText(phrase), options).finally(() => this.activePhraseAudio.set(null));
  }

  /** Cambio explicito del idioma de la conversacion (boton). */
  protected switchLanguage(): void {
    if (this.busy) return;
    this.applyLanguageSwitch(this.switchTarget());
  }

  private converse(prompt: string, variant: VariantId, reply$: Observable<LiaReply>, viaVoice: boolean): void {
    const token = ++this.replyToken;
    this.pushUser(prompt, viaVoice, variant);
    this.state.set('processing');
    reply$.subscribe({
      next: (reply) => {
        this.state.set('speaking');
        this.completionTimer = globalThis.setTimeout(() => {
          const pending = this.seniorState.nextMedication();
          const medicationRecorded = reply.intent === 'MEDICATION_TAKEN' && !!pending;
          if (medicationRecorded) this.seniorState.takeMedication(pending.id);
          const report = this.answer(reply, medicationRecorded, token);
          this.messages.update((items) => [...items, {
            ...this.liaMessage(`lia-${Date.now()}`, reply.message, report),
            text: reply.text, confirmation: medicationRecorded, action: reply.action, intent: reply.intent,
            ...(reply.spanishTranslation ? { spanishTranslation: reply.spanishTranslation } : {}),
          }]);
          this.state.set('completed');
        }, 450);
      },
      error: () => { this.clearWaiting(); this.coordinator.releaseLia(); this.state.set('error'); },
    });
  }

  /** LIA dice la respuesta (el texto sigue en pantalla), devuelve el turno de voz y abre la pantalla existente si toca. */
  private answer(reply: LiaReply, medicationRecorded: boolean, token: number): LiaOutputReport {
    this.clearWaiting();
    // Solo se confirma por voz lo que de verdad quedo registrado.
    const message = reply.intent === 'MEDICATION_TAKEN' && !medicationRecorded
      ? this.phrases.t('medication.nothingToRecord', {}, reply.message.variant)
      : reply.spoken ?? reply.message;
    const report = this.output.deliver(message, { priority: SPEECH_PRIORITY[reply.intent] });
    // Si LIA esta hablando, los comandos globales esperan a que termine (coordinador).
    this.coordinator.releaseLia();
    if (reply.opens) void this.openWhenDone(reply.opens, report.done, token);
    return report;
  }

  /** "Habla en español" / "en náhuatl" / "en zapoteco": la frase de cambio solo existe en espanol. */
  private languageSwitchRequest(prompt: string): LiaLanguageCode | null {
    const spanish = this.lexicons.forVariant('es');
    return spanish.languageSwitch(spanish.normalize(prompt));
  }

  private applyLanguageSwitch(target: LiaLanguageCode): void {
    this.language.switchInteraction(target);
    const key = target === 'es' ? 'lia.languageSwitched.es' : 'lia.languageSwitched.pilot';
    this.pushLia(`lia-lang-${Date.now()}`, this.phrases.t(key, { language: variantInfo(target).shortLabel.toLowerCase() }, target), 'NORMAL');
  }

  private pushUser(text: string, viaVoice: boolean, variant: VariantId): void {
    this.messages.update((items) => [...items, { id: `user-${Date.now()}`, sender: 'user', text, viaVoice, variant }]);
  }

  /** Muestra y dice un mensaje de LIA. */
  private pushLia(id: string, message: LocalizedText, priority: LiaSpeechPriority, action?: LiaAction): void {
    const report = this.output.deliver(message, { priority });
    this.messages.update((items) => [...items, { ...this.liaMessage(id, message, report), ...(action ? { action } : {}) }]);
  }

  /** Mensaje de LIA con su lengua; si el idioma no tiene esa frase, el espanol marcado como respaldo. */
  private liaMessage(id: string, message: LocalizedText, report?: LiaOutputReport): LiaMessage {
    return {
      id, sender: 'lia', text: message.text, variant: message.variant,
      ...(message.available ? {} : { translationPending: true }),
      ...(message.available && message.variant !== 'es' ? { pilotText: true } : {}),
      ...(report?.spokenVia === 'spanish-fallback' ? { spanishVoice: true } : {}),
    };
  }

  protected pendingNote(message: LiaMessage): string {
    const language = variantInfo(message.variant ?? 'es').shortLabel.toLowerCase();
    if (message.translationPending) return `Se muestra en español: esta frase aún no existe en ${language}${message.spanishVoice ? ' · leída en español (respaldo autorizado)' : ''}.`;
    return `Frase predeterminada en ${language} (piloto), sin validación de hablantes nativos.`;
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
    // Vosk para espanol; para los pilotos, Vosk espanol como respaldo experimental (no hay ASR nativo).
    this.activeProvider = this.recognition.forVariant(this.language.interactionVariant());
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
      const provider = this.activeProvider ?? this.recognition.forVariant(this.language.interactionVariant());
      const result = await provider.transcribe(recording);
      this.state.set('stopped');
      if (!result.text) { this.voiceFailed(this.phrases.t('lia.voiceNotUnderstood', {}, result.variant)); return; }
      this.send(result.text, true, result.variant);
    } catch (error) {
      this.state.set('idle');
      this.voiceFailed(error instanceof Error ? error.message : 'No pude procesar tu voz. Puedes seguir escribiendo.');
    } finally {
      this.transcribing.set(false);
    }
  }

  /** Avisos de voz: los de LIA salen en la lengua de la conversacion; los del sistema solo existen en espanol. */
  private voiceFailed(message: LocalizedText | string): void {
    this.clearWaiting();
    const report = typeof message === 'string'
      ? this.output.deliverSpanishNotice(message, { priority: 'NORMAL' })
      : this.output.deliver(message, { priority: 'NORMAL' });
    this.voiceNotice.set(report.visibleText);
    this.coordinator.releaseLia();
  }

  /** Si la respuesta es inmediata no se dice ninguno de los dos avisos; la respuesta real los interrumpe o los sigue. */
  private scheduleWaitingNotices(): void {
    this.clearWaiting();
    this.waitingTimers = [
      globalThis.setTimeout(() => this.output.deliver(this.phrases.t('lia.heard'), { priority: 'NORMAL' }), HEARD_NOTICE_MS),
      globalThis.setTimeout(() => this.output.deliver(this.phrases.t('lia.processing'), { priority: 'LOW' }), PROCESSING_NOTICE_MS),
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

  protected takeMedication(id: string): void { this.seniorState.takeMedication(id); }
  protected requestHelp(): void { this.openAction({ label: 'Solicitar ayuda', route: '/senior/emergency', emergency: true }); }
  protected openAction(action: LiaAction): void {
    // "Llamar a Ana": confirmacion con el enlace tel:; VITALIA nunca marca por su cuenta.
    if (action.callContactId) { this.callContact.set(this.contacts.contacts().find((contact) => contact.id === action.callContactId) ?? null); return; }
    if (action.emergency && this.emergency.startVoiceRequest({ type: 'HELP', reason: 'Necesito ayuda', source: 'LIA' })) {
      this.output.deliver(this.phrases.t('lia.helpStarting'), { priority: 'CRITICAL' });
    }
    void this.router.navigateByUrl(action.route);
  }
  protected announceCall(contact: SeniorContact): void {
    this.output.deliver(this.phrases.t('voice.call.opening', { firstName: contact.name.split(/\s+/)[0] }), { priority: 'HIGH' });
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.awaitingEmergencyReason.set(false);
    this.clearWaiting();
    if (this.completionTimer) globalThis.clearTimeout(this.completionTimer);
    this.audio.release();
    this.coordinator.releaseLia();
  }
}

import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { AudioCaptureService } from './audio-capture.service';
import { VoiceSessionCoordinatorService } from './voice-session-coordinator.service';

export type LiaSpeechStatus = 'idle' | 'speaking' | 'paused' | 'error';
/** CRITICAL: emergencia · HIGH: llamada, ubicacion · NORMAL: medicamentos, navegacion · LOW: informativos. */
export type LiaSpeechPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface LiaSpeakOptions {
  priority?: LiaSpeechPriority;
  /** Calla lo que se este diciendo y descarta lo pendiente, aunque tenga la misma prioridad. */
  interrupt?: boolean;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface SpeechItem {
  text: string;
  priority: LiaSpeechPriority;
  options: LiaSpeakOptions;
  resolve: (spoken: boolean) => void;
  utterance?: SpeechSynthesisUtterance;
  retried?: boolean;
}

const DEFAULTS = { lang: 'es-MX', rate: 0.9, pitch: 1, volume: 1 } as const;
const RANK: Readonly<Record<LiaSpeechPriority, number>> = { LOW: 0, NORMAL: 1, HIGH: 2, CRITICAL: 3 };
/** Cola corta: un mensaje en curso y como mucho dos esperando. */
const MAX_PENDING = 2;
/** Margen tras `end` antes de devolver el microfono: algunos navegadores lo emiten antes de que acabe el audio. */
const ECHO_GUARD_MS = 400;
/** Chrome puede tragarse un `speak()` inmediatamente posterior a `cancel()`. */
const CANCEL_SETTLE_MS = 60;
/** Si `end` nunca llega (fallo conocido de algunos navegadores y voces en linea), se da por terminado. */
const WATCHDOG_BASE_MS = 5000;
const WATCHDOG_PER_CHAR_MS = 110;
const STORAGE_KEY = 'vitalia.lia-voice';

const normalizedLang = (voice: SpeechSynthesisVoice) => voice.lang.replace('_', '-').toLowerCase();

/**
 * Voz de LIA: Microsoft Dalia (es-MX) y, si no existe, la primera voz es-MX, es-419, es-ES o cualquier espanol.
 * Se elige por idioma y no solo por nombre, porque cada navegador y sistema ofrece voces distintas.
 */
export function pickLiaVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const byLang = (lang: string) => voices.find((voice) => normalizedLang(voice) === lang);
  return voices.find((voice) => /\bdalia\b/i.test(voice.name) && normalizedLang(voice) === 'es-mx')
    ?? byLang('es-mx')
    ?? byLang('es-419')
    ?? byLang('es-es')
    ?? voices.find((voice) => normalizedLang(voice).startsWith('es'))
    ?? null;
}

/**
 * Voz de salida de LIA con `speechSynthesis` (solo TTS; la entrada sigue siendo Vosk).
 * - Antes de sonar pide al coordinador que cierre el microfono y lo devuelve al terminar: LIA nunca se escucha.
 * - Cola corta por prioridad: una emergencia calla y descarta los mensajes secundarios.
 * - La preferencia "Voz de LIA" se guarda en este dispositivo; desactivarla solo silencia a LIA.
 */
@Injectable({ providedIn: 'root' })
export class LiaSpeechService {
  private readonly document = inject(DOCUMENT);
  private readonly coordinator = inject(VoiceSessionCoordinatorService);
  private readonly audio = inject(AudioCaptureService);
  private readonly synth: SpeechSynthesis | null = this.document.defaultView?.speechSynthesis ?? null;
  private readonly failedVoices = new Set<string>();
  private current: SpeechItem | null = null;
  private pending: SpeechItem[] = [];
  private releaseTimer?: ReturnType<typeof setTimeout>;
  private startTimer?: ReturnType<typeof setTimeout>;
  private watchdog?: ReturnType<typeof setTimeout>;
  private readonly enabledState = signal(this.restore());

  readonly supported = !!this.synth && typeof globalThis.SpeechSynthesisUtterance === 'function';
  readonly enabled = this.enabledState.asReadonly();
  readonly status = signal<LiaSpeechStatus>('idle');
  readonly currentMessage = signal<string | null>(null);
  readonly isSpeaking = computed(() => this.status() === 'speaking');
  /** Voz elegida; puede llegar tarde porque los navegadores cargan las voces de forma asincrona. */
  readonly voice = signal<SpeechSynthesisVoice | null>(null);

  constructor() {
    this.coordinator.registerSpeech({ stop: () => this.stop() });
    const onVoices = () => this.refreshVoice();
    const onVisibility = () => { if (this.document.visibilityState === 'hidden') this.stop(); };
    if (this.supported) {
      this.refreshVoice();
      this.synth!.addEventListener?.('voiceschanged', onVoices);
    }
    this.document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      this.synth?.removeEventListener?.('voiceschanged', onVoices);
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.stop();
      this.coordinator.unregisterSpeech();
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabledState.set(enabled);
    try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch { /* Sin almacenamiento: vale para esta sesion. */ }
    if (!enabled) this.stop();
  }

  /** Resuelve `true` si el mensaje se dijo completo y `false` si se omitio, se interrumpio o fallo. */
  speak(text: string, options: LiaSpeakOptions = {}): Promise<boolean> {
    const message = text.trim();
    if (!message || !this.enabled() || !this.supported) return Promise.resolve(false);
    // La persona le esta hablando a LIA: nunca se habla encima de una grabacion.
    const capture = this.audio.status();
    if (capture === 'recording' || capture === 'requesting') return Promise.resolve(false);
    return new Promise((resolve) => this.enqueue({ text: message, priority: options.priority ?? 'NORMAL', options, resolve }));
  }

  /** Calla a LIA, descarta lo pendiente y devuelve el microfono. */
  stop(): void {
    this.dropPending(() => true);
    this.cancelCurrent();
    clearTimeout(this.releaseTimer);
    this.status.set('idle');
    this.currentMessage.set(null);
    this.coordinator.endSpeech();
  }

  /** En pausa el microfono sigue cerrado: LIA puede continuar la frase. */
  pause(): void {
    if (this.status() !== 'speaking' || !this.synth) return;
    this.synth.pause();
    clearTimeout(this.watchdog);
    this.status.set('paused');
  }

  resume(): void {
    if (this.status() !== 'paused' || !this.synth || !this.current) return;
    this.synth.resume();
    this.status.set('speaking');
    this.armWatchdog(this.current);
  }

  private enqueue(item: SpeechItem): void {
    const rank = RANK[item.priority];
    if (item.options.interrupt) {
      this.dropPending(() => true);
      const interrupted = !!this.current;
      this.cancelCurrent();
      this.start(item, interrupted);
      return;
    }
    // Lo nuevo y mas importante deja sin sentido lo secundario que esperaba.
    this.dropPending((other) => RANK[other.priority] < rank);
    if (!this.current) { this.start(item, false); return; }
    if (rank > RANK[this.current.priority]) {
      this.cancelCurrent();
      this.start(item, true);
      return;
    }
    this.pending.push(item);
    if (this.pending.length > MAX_PENDING) {
      const lowest = Math.min(...this.pending.map((other) => RANK[other.priority]));
      const [dropped] = this.pending.splice(this.pending.findIndex((other) => RANK[other.priority] === lowest), 1);
      dropped.resolve(false);
    }
  }

  private start(item: SpeechItem, afterCancel: boolean): void {
    clearTimeout(this.releaseTimer);
    this.current = item;
    this.status.set('speaking');
    this.currentMessage.set(item.text);
    // Primero se cierra el microfono y despues suena la voz.
    this.coordinator.beginSpeech();
    if (afterCancel) this.startTimer = setTimeout(() => this.utter(item), CANCEL_SETTLE_MS);
    else this.utter(item);
  }

  private utter(item: SpeechItem): void {
    if (this.current !== item || !this.synth) return;
    const utterance = new SpeechSynthesisUtterance(item.text);
    const voice = this.voice() ?? this.refreshVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? item.options.lang ?? DEFAULTS.lang;
    utterance.rate = item.options.rate ?? DEFAULTS.rate;
    utterance.pitch = item.options.pitch ?? DEFAULTS.pitch;
    utterance.volume = item.options.volume ?? DEFAULTS.volume;
    utterance.onend = () => this.finish(item, true);
    utterance.onerror = (event) => this.fail(item, event.error);
    // Se conserva la referencia: si el navegador la libera, `end` no llega.
    item.utterance = utterance;
    if (this.synth.paused) this.synth.resume();
    this.synth.speak(utterance);
    this.armWatchdog(item);
  }

  private finish(item: SpeechItem, spoken: boolean): void {
    if (this.current !== item) return;
    clearTimeout(this.watchdog);
    this.current = null;
    item.resolve(spoken);
    this.next();
  }

  private fail(item: SpeechItem, error: SpeechSynthesisErrorCode): void {
    if (this.current !== item) return;
    if (error === 'interrupted' || error === 'canceled') { this.finish(item, false); return; }
    // Una voz en linea puede fallar sin red: se descarta y se repite una vez con otra voz.
    const voice = item.utterance?.voice;
    if (voice && !voice.localService && !item.retried) {
      this.failedVoices.add(voice.voiceURI);
      this.refreshVoice();
      item.retried = true;
      clearTimeout(this.watchdog);
      this.utter(item);
      return;
    }
    this.status.set('error');
    this.finish(item, false);
  }

  private next(afterCancel = false): void {
    const following = this.pending.shift();
    if (following) { this.start(following, afterCancel); return; }
    if (this.status() !== 'error') this.status.set('idle');
    this.currentMessage.set(null);
    this.releaseTimer = setTimeout(() => this.coordinator.endSpeech(), ECHO_GUARD_MS);
  }

  private cancelCurrent(): void {
    const item = this.current;
    clearTimeout(this.startTimer);
    clearTimeout(this.watchdog);
    if (!item) return;
    this.current = null;
    item.resolve(false);
    this.synth?.cancel();
  }

  private dropPending(match: (item: SpeechItem) => boolean): void {
    const dropped = this.pending.filter(match);
    this.pending = this.pending.filter((item) => !match(item));
    dropped.forEach((item) => item.resolve(false));
  }

  private armWatchdog(item: SpeechItem): void {
    clearTimeout(this.watchdog);
    const rate = item.options.rate ?? DEFAULTS.rate;
    const limit = WATCHDOG_BASE_MS + (item.text.length * WATCHDOG_PER_CHAR_MS) / rate;
    this.watchdog = setTimeout(() => {
      if (this.current !== item) return;
      this.current = null;
      item.resolve(false);
      this.synth?.cancel();
      this.next(true);
    }, limit);
  }

  private refreshVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices().filter((voice) => !this.failedVoices.has(voice.voiceURI));
    const voice = pickLiaVoice(voices);
    this.voice.set(voice);
    return voice;
  }

  private restore(): boolean {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  }
}

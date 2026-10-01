import { Injectable, signal } from '@angular/core';

export type VoiceSessionOwner = 'IDLE' | 'LIA' | 'GLOBAL';
/** Por que se pausa la escucha global: LIA escucha a la persona o LIA esta hablando (TTS). */
export type VoicePauseReason = 'LIA' | 'SPEECH';

export interface GlobalVoiceHandlers {
  /** Detener la escucha global para ceder el microfono. */
  pause(reason: VoicePauseReason): void;
  /** Volver a escuchar cuando el microfono queda libre. */
  resume(): void;
}

export interface SpeechHandlers {
  /** Callar a LIA de inmediato. */
  stop(): void;
}

/**
 * Coordinador unico del microfono: solo una sesion de voz a la vez. La conversacion con LIA tiene prioridad;
 * si LIA empieza a escuchar, los comandos globales se pausan y se reanudan cuando LIA termina.
 * Mientras LIA habla (TTS) ningun microfono escucha, para que no se oiga a si misma.
 */
@Injectable({ providedIn: 'root' })
export class VoiceSessionCoordinatorService {
  readonly owner = signal<VoiceSessionOwner>('IDLE');
  /** Los comandos globales esperan su turno mientras LIA usa el microfono o habla. */
  readonly globalPaused = signal(false);
  /** LIA esta hablando: el microfono permanece cerrado. */
  readonly speaking = signal(false);
  private global: GlobalVoiceHandlers | null = null;
  private speech: SpeechHandlers | null = null;

  registerGlobal(handlers: GlobalVoiceHandlers): void { this.global = handlers; }

  unregisterGlobal(): void {
    this.global = null;
    this.globalPaused.set(false);
    if (this.owner() === 'GLOBAL') this.owner.set('IDLE');
  }

  registerSpeech(handlers: SpeechHandlers): void { this.speech = handlers; }

  unregisterSpeech(): void { this.speech = null; }

  /** La escucha global pide el microfono; si LIA lo usa o esta hablando, queda en pausa hasta que se libere. */
  requestGlobal(): boolean {
    if (this.owner() === 'LIA' || this.speaking()) { this.globalPaused.set(true); return false; }
    this.owner.set('GLOBAL');
    this.globalPaused.set(false);
    return true;
  }

  releaseGlobal(): void {
    if (this.owner() === 'GLOBAL') this.owner.set('IDLE');
    this.globalPaused.set(false);
  }

  /** LIA va a escuchar: pausa los comandos globales si estaban activos y la calla si estaba hablando. */
  acquireLia(): void {
    if (this.owner() === 'GLOBAL') {
      this.globalPaused.set(true);
      this.global?.pause('LIA');
    }
    this.owner.set('LIA');
    if (this.speaking()) this.speech?.stop();
  }

  /** LIA termino de usar el microfono: los comandos globales pueden reanudarse. */
  releaseLia(): void {
    if (this.owner() !== 'LIA') return;
    this.owner.set('IDLE');
    this.resumeGlobal();
  }

  /** LIA va a hablar: la escucha global suelta el microfono antes de que suene la voz. */
  beginSpeech(): void {
    this.speaking.set(true);
    if (this.owner() === 'GLOBAL') {
      this.owner.set('IDLE');
      this.globalPaused.set(true);
      this.global?.pause('SPEECH');
    }
  }

  /** LIA termino de hablar: la escucha global se reanuda solo si estaba activa antes. */
  endSpeech(): void {
    if (!this.speaking()) return;
    this.speaking.set(false);
    this.resumeGlobal();
  }

  private resumeGlobal(): void {
    if (this.owner() !== 'IDLE' || this.speaking() || !this.globalPaused() || !this.global) return;
    this.globalPaused.set(false);
    this.global.resume();
  }
}

import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';
import { LiaSpeechService } from '../../../core/services/lia-speech.service';
import { AccessibilityMode } from '../models/senior.models';

@Injectable({ providedIn: 'root' })
export class AccessibilityPreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly speech = inject(LiaSpeechService);
  private readonly storageKey = 'vitalia.accessibility-mode';
  readonly mode = signal<AccessibilityMode>(this.restore());
  /** Voz de LIA (TTS). La guarda `LiaSpeechService` para aplicarla desde el inicio; apagarla no afecta a los comandos de voz. */
  readonly liaVoice = this.speech.enabled;
  readonly liaVoiceSupported = this.speech.supported;

  constructor() {
    effect(() => {
      const mode = this.mode();
      const root = this.document.documentElement;
      root.classList.remove('mode-standard', 'mode-accessible', 'mode-assisted', 'mode-simplified');
      root.classList.add(`mode-${mode}`);
      localStorage.setItem(this.storageKey, mode);
    });
  }

  setMode(mode: AccessibilityMode): void { this.mode.set(mode); }

  setLiaVoice(enabled: boolean): void { this.speech.setEnabled(enabled); }

  private restore(): AccessibilityMode {
    const stored = localStorage.getItem(this.storageKey);
    return stored === 'accessible' || stored === 'assisted' || stored === 'simplified' ? stored : 'standard';
  }
}

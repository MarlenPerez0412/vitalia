import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';
import { LanguageContextService } from '../../../core/i18n/language-context.service';
import { LiaLanguageCode } from '../../../core/i18n/language.models';
import { LiaSpeechService } from '../../../core/services/lia-speech.service';
import { AccessibilityMode } from '../models/senior.models';

@Injectable({ providedIn: 'root' })
export class AccessibilityPreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly speech = inject(LiaSpeechService);
  private readonly languageContext = inject(LanguageContextService);
  private readonly storageKey = 'vitalia.accessibility-mode';
  readonly mode = signal<AccessibilityMode>(this.restore());
  /** Voz de LIA (TTS). La guarda `LiaSpeechService` para aplicarla desde el inicio; apagarla no afecta a los comandos de voz. */
  readonly liaVoice = this.speech.enabled;
  readonly liaVoiceSupported = this.speech.supported;
  /** Idioma de VITALIA (LIA responde en el mismo idioma en que se le habla). Lo guarda `LanguageContextService`. */
  readonly liaLanguage = this.languageContext.liaLanguage;
  readonly allowSpanishFallback = this.languageContext.allowSpanishFallback;

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

  setLanguage(language: LiaLanguageCode): void { this.languageContext.setLiaLanguage(language); }

  setAllowSpanishFallback(allowed: boolean): void { this.languageContext.setAllowSpanishFallback(allowed); }

  private restore(): AccessibilityMode {
    const stored = localStorage.getItem(this.storageKey);
    return stored === 'accessible' || stored === 'assisted' || stored === 'simplified' ? stored : 'standard';
  }
}

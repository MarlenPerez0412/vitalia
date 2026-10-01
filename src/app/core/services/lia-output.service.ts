import { inject, Injectable, InjectionToken } from '@angular/core';
import { LanguageContextService } from '../i18n/language-context.service';
import { LiaLanguageCode, LocalizedText } from '../i18n/language.models';
import { variantInfo } from '../i18n/language-variants';
import { PhrasebookService } from '../i18n/phrasebook.service';
import { LiaSpeechPriority, LiaSpeechService } from './lia-speech.service';

export interface LiaOutputOptions {
  priority: LiaSpeechPriority;
  interrupt?: boolean;
}

/** Cómo se dijo (o no) la respuesta. Nunca se oculta un respaldo: la interfaz lo muestra. */
export type LiaSpokenVia = 'speech-synthesis' | 'native-tts' | 'recorded' | 'spanish-fallback' | 'none';

export interface LiaOutputReport {
  /** Texto a mostrar (siempre se muestra, haya voz o no). */
  visibleText: string;
  /** El idioma no tenía esta cadena: se muestra en español. */
  translationPending: boolean;
  spokenVia: LiaSpokenVia;
  /** Se resuelve cuando termina la voz (o de inmediato si no hubo voz). */
  done: Promise<boolean>;
}

/** Voz nativa de un idioma piloto (p. ej. un modelo TTS validado en el servidor). Hoy no hay ninguna compatible. */
export interface PilotTtsProvider {
  readonly variant: LiaLanguageCode;
  isAvailable(): Promise<boolean>;
  synthesize(text: string): Promise<Blob>;
}

/** Voz experimental de los pilotos: apagada por defecto. */
export const LIA_EXPERIMENTAL_TTS_ENABLED = new InjectionToken<boolean>('LIA_EXPERIMENTAL_TTS_ENABLED', { providedIn: 'root', factory: () => false });
export const LIA_PILOT_TTS_PROVIDERS = new InjectionToken<readonly PilotTtsProvider[]>('LIA_PILOT_TTS_PROVIDERS', { providedIn: 'root', factory: () => [] });

/**
 * Salida de LIA independiente del motor de voz. La lógica de negocio entrega un texto localizado y una prioridad:
 * - español: speechSynthesis (LiaSpeechService.speak, síncrono, como siempre);
 * - náhuatl/zapoteco piloto: el texto se muestra SIEMPRE; solo se dice con una voz nativa compatible (si el flag
 *   experimental está activo) o con un audio pregrabado validado. Nunca se lee con la voz española fingiendo la
 *   pronunciación. Si falta la cadena y se muestra en español, solo se dice si la persona lo permitió.
 * Las emergencias nunca esperan a la voz.
 */
@Injectable({ providedIn: 'root' })
export class LiaOutputService {
  private readonly speech = inject(LiaSpeechService);
  private readonly phrases = inject(PhrasebookService);
  private readonly language = inject(LanguageContextService);
  private readonly experimentalTts = inject(LIA_EXPERIMENTAL_TTS_ENABLED);
  private readonly pilotTts = inject(LIA_PILOT_TTS_PROVIDERS);

  deliver(message: LocalizedText, options: LiaOutputOptions): LiaOutputReport {
    const report = (spokenVia: LiaSpokenVia, done: Promise<boolean>): LiaOutputReport =>
      ({ visibleText: message.text, translationPending: !message.available, spokenVia, done });
    const speak = { priority: options.priority, interrupt: options.interrupt };

    if (!message.available) {
      // Cadena en español por falta de traducción: voz española solo con permiso.
      return this.language.allowSpanishFallback()
        ? report('spanish-fallback', this.speech.speak(message.text, { ...speak, lang: 'es-MX' }))
        : report('none', Promise.resolve(false));
    }
    const recorded = this.phrases.recordedAudio(message.key, message.variant);
    if (recorded) return report('recorded', this.speech.playClip(recorded, { ...speak, label: message.text }));
    const provider = this.experimentalTts ? this.pilotTts.find((item) => item.variant === message.variant) : undefined;
    if (provider) return report('native-tts', this.speakNative(provider, message.text, options));
    if (variantInfo(message.variant).tts === 'speech-synthesis') {
      const lang = message.variant === 'nahuatl-pilot' ? 'nah' : message.variant === 'zapoteco-pilot' ? 'zap' : undefined;
      return report('speech-synthesis', this.speech.speak(message.text, { ...speak, ...(lang ? { lang } : {}) }));
    }
    return report('none', Promise.resolve(false));
  }

  /**
   * Mensajes del sistema que solo existen en español (errores del navegador o del servidor de voz, o el aviso de
   * comando no reconocido). En una conversación en otra lengua se muestran y solo se dicen si la persona lo permitió.
   */
  deliverSpanishNotice(text: string, options: LiaOutputOptions): LiaOutputReport {
    const spanishConversation = this.language.interactionVariant() === 'es';
    if (spanishConversation || this.language.allowSpanishFallback()) {
      const done = this.speech.speak(text, { priority: options.priority, interrupt: options.interrupt });
      return { visibleText: text, translationPending: !spanishConversation, spokenVia: spanishConversation ? 'speech-synthesis' : 'spanish-fallback', done };
    }
    return { visibleText: text, translationPending: true, spokenVia: 'none', done: Promise.resolve(false) };
  }

  /** La voz nativa nunca bloquea: si falla, queda el texto. */
  private async speakNative(provider: PilotTtsProvider, text: string, options: LiaOutputOptions): Promise<boolean> {
    try {
      if (!(await provider.isAvailable())) return false;
      return await this.speech.playClip(await provider.synthesize(text), { priority: options.priority, interrupt: options.interrupt, label: text });
    } catch {
      return false;
    }
  }
}

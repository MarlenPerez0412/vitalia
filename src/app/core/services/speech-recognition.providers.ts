import { inject, Injectable } from '@angular/core';
import { LiaLanguageCode } from '../i18n/language.models';
import { AudioRecording } from '../models/permission.models';
import { VoiceApiService } from './voice-api.service';

export interface TranscriptionResult {
  text: string;
  /** Idioma de la persona según la conversación: es la lengua de la entrada (y de la respuesta). */
  variant: LiaLanguageCode;
  provider: 'vosk' | 'vosk-fallback';
  /** true si el texto es una aproximación (Vosk español escuchando otra lengua). */
  experimental: boolean;
}

/** Reconocimiento de voz de un idioma. La lógica de LIA no sabe qué motor hay detrás. */
export interface SpeechRecognitionProvider {
  readonly variant: LiaLanguageCode;
  readonly experimental: boolean;
  transcribe(recording: AudioRecording): Promise<TranscriptionResult>;
}

/**
 * Vosk español en FastAPI, exactamente la misma petición de siempre. Para náhuatl y zapoteco no hay ASR nativo:
 * se usa como respaldo EXPERIMENTAL y el texto aproximado pasa al matcher multilingüe (voskVariants + similitud).
 */
class VoskProvider implements SpeechRecognitionProvider {
  constructor(private readonly voiceApi: VoiceApiService, readonly variant: LiaLanguageCode) {}

  get experimental(): boolean { return this.variant !== 'es'; }

  async transcribe(recording: AudioRecording): Promise<TranscriptionResult> {
    const text = await this.voiceApi.transcribe(recording);
    return { text, variant: this.variant, provider: this.experimental ? 'vosk-fallback' : 'vosk', experimental: this.experimental };
  }
}

/** Elige el proveedor del idioma de la conversación. */
@Injectable({ providedIn: 'root' })
export class SpeechRecognitionRegistry {
  private readonly voiceApi = inject(VoiceApiService);
  private readonly providers: Readonly<Record<LiaLanguageCode, SpeechRecognitionProvider>> = {
    es: new VoskProvider(this.voiceApi, 'es'),
    'nahuatl-pilot': new VoskProvider(this.voiceApi, 'nahuatl-pilot'),
    'zapoteco-pilot': new VoskProvider(this.voiceApi, 'zapoteco-pilot'),
  };

  forVariant(variant: LiaLanguageCode): SpeechRecognitionProvider {
    return this.providers[variant];
  }
}

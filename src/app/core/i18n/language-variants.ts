import { LanguageId, LIA_LANGUAGE_CODES, LiaLanguageCode } from './language.models';

export interface LanguageVariantInfo {
  id: LiaLanguageCode;
  language: LanguageId;
  label: string;
  /** Nombre corto para frases ("Seguiremos en náhuatl"). */
  shortLabel: string;
  status: 'stable' | 'pilot';
  /** Voz de salida disponible hoy: solo el español tiene voz (speechSynthesis). */
  tts: 'speech-synthesis' | 'none';
  /** Reconocimiento: Vosk español; en los pilotos, como aproximación experimental. */
  recognition: 'vosk' | 'vosk-fallback-experimental';
  notes: string;
}

/**
 * Idiomas de LIA. Agregar otro = una entrada aquí + su catálogo en `lia-multilingual-intents.ts`.
 * Las variantes piloto no cubren el idioma completo: solo las intenciones con frases predeterminadas.
 */
export const LANGUAGE_VARIANTS: readonly LanguageVariantInfo[] = [
  {
    id: 'es', language: 'es', label: 'Español (México)', shortLabel: 'español', status: 'stable',
    tts: 'speech-synthesis', recognition: 'vosk', notes: '',
  },
  {
    id: 'nahuatl-pilot', language: 'nahuatl', label: 'Náhuatl', shortLabel: 'náhuatl', status: 'pilot',
    tts: 'speech-synthesis', recognition: 'vosk-fallback-experimental',
    notes: 'Piloto: frases predeterminadas para el MVP, sin validación nativa. La variante dialectal está por confirmar.',
  },
  {
    id: 'zapoteco-pilot', language: 'zapoteco', label: 'Zapoteco', shortLabel: 'zapoteco', status: 'pilot',
    tts: 'speech-synthesis', recognition: 'vosk-fallback-experimental',
    notes: 'Piloto: frases predeterminadas para el MVP, sin validación nativa. La variante dialectal está por confirmar.',
  },
];

export const DEFAULT_LIA_LANGUAGE: LiaLanguageCode = 'es';

export function variantInfo(id: LiaLanguageCode): LanguageVariantInfo {
  return LANGUAGE_VARIANTS.find((variant) => variant.id === id) ?? LANGUAGE_VARIANTS[0];
}

export function isLiaLanguage(value: unknown): value is LiaLanguageCode {
  return typeof value === 'string' && (LIA_LANGUAGE_CODES as readonly string[]).includes(value);
}

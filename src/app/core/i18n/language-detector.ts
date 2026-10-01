import { normalizeText } from '../utils/text-normalize';
import { LanguageId, LiaLanguageCode } from './language.models';
import { variantInfo } from './language-variants';

export interface LanguageDetection {
  language: LanguageId | null;
  variant: LiaLanguageCode | null;
  confidence: number;
  reason: string;
}

/** Umbral a partir del cual una detección puede cambiar el idioma de la conversación. */
export const LANGUAGE_SWITCH_CONFIDENCE = 0.85;
/** Nunca se decide con menos palabras: una sola palabra no basta para cambiar de idioma. */
const MIN_WORDS = 3;

/** Palabras funcionales y de dominio del español de LIA (se comparan sin tildes). */
const SPANISH_WORDS = new Set([
  'a', 'al', 'algo', 'como', 'con', 'cual', 'cuando', 'de', 'del', 'donde', 'el', 'en', 'es', 'esta', 'estoy', 'hay', 'la', 'las',
  'lo', 'los', 'me', 'mi', 'mis', 'muy', 'no', 'para', 'pero', 'por', 'que', 'quiero', 'se', 'si', 'su', 'te', 'tu', 'un', 'una',
  'y', 'ya', 'yo', 'ayuda', 'ayudame', 'necesito', 'medicamento', 'medicacion', 'medicina', 'pastilla', 'toca', 'tome', 'tomando',
  'hija', 'hijo', 'familia', 'llama', 'llamar', 'hablar', 'ubicacion', 'mapa', 'siento', 'mal', 'bien', 'cai', 'pension', 'memoria',
  'ejercicio', 'ejercicios', 'registrar', 'hacer', 'dame', 'informacion', 'muestrame', 'gracias', 'hola', 'buenos', 'dias', 'tardes',
  'noches', 'favor', 'habla', 'espanol',
]);

/** Coincidencia del texto con una frase predeterminada de un idioma piloto (la da el matcher multilingüe). */
export interface PilotPhraseMatch {
  language: LiaLanguageCode;
  confidence: number;
}

/**
 * Detección conservadora para texto escrito: una frase predeterminada de un idioma piloto (coincidencia alta del
 * matcher) o una proporción clara de palabras en español. Con menos de tres palabras o señales débiles no decide.
 */
export function detectLanguage(text: string, pilotMatch: PilotPhraseMatch | null = null): LanguageDetection {
  const words = normalizeText(text).split(' ').filter(Boolean);
  if (words.length < MIN_WORDS) return { language: null, variant: null, confidence: 0, reason: 'texto demasiado corto' };
  if (pilotMatch && pilotMatch.confidence >= 0.9) {
    return { language: variantInfo(pilotMatch.language).language, variant: pilotMatch.language, confidence: pilotMatch.confidence, reason: 'frase predeterminada del idioma' };
  }
  const spanishRatio = words.filter((word) => SPANISH_WORDS.has(word)).length / words.length;
  if (spanishRatio >= 0.5) {
    return { language: 'es', variant: 'es', confidence: Math.min(0.95, 0.6 + spanishRatio * 0.5), reason: 'palabras en español' };
  }
  return { language: null, variant: null, confidence: spanishRatio, reason: 'señales insuficientes' };
}

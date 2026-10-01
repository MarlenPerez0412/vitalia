/** Apóstrofos y saltillos que se escriben de formas distintas (', ’, ʼ, ‘, ´, `): se unifican en '. */
const APOSTROPHES = /['’ʼ‘´`]/g;
/** Todo lo que no es letra, marca diacrítica, número, apóstrofo o espacio se trata como puntuación. */
const PUNCTUATION = /[^\p{L}\p{M}\p{N}'\s]/gu;
/**
 * Palabra de activación al inicio: "LIA"/"Lía" y las formas en que la transcribe Vosk (lea, leah, lya, lila, ilia,
 * elia), con saludo opcional. Se evitan palabras comunes ("día", "tía") para no activar por conversaciones ajenas.
 */
const WAKE_WORD = /^(?:(?:oye|hola|ey|oiga|por favor)\s+)?(?:lia|lía|lea|leah|lya|lila|ilia|elia)(?:\s+|$)/;

export interface NormalizeVoiceOptions {
  /** Quita la palabra de activación ("LIA, ...") antes de comparar. */
  stripWakeWord?: boolean;
}

/**
 * Normaliza una frase hablada o escrita para compararla: minúsculas, sin puntuación, espacios colapsados y apóstrofos
 * unificados. Conserva tildes y saltillos dentro de las palabras (en zapoteco distinguen palabras). NO traduce.
 */
export function normalizeVoicePhrase(text: string, options: NormalizeVoiceOptions = {}): string {
  let value = text.normalize('NFC').toLowerCase().replace(APOSTROPHES, "'").replace(PUNCTUATION, ' ');
  // Un apóstrofo suelto (no pegado a una letra) es puntuación.
  value = value.replace(/(^|\s)'+(?=\s|$)/g, '$1').replace(/\s+/g, ' ').trim();
  if (options.stripWakeWord) value = value.replace(WAKE_WORD, '').trim();
  return value;
}

/**
 * Forma "suelta" para comparar con transcripciones de Vosk español: además ignora tildes y apóstrofos, que Vosk
 * no reproduce de forma fiable.
 */
export function loosePhrase(text: string, options: NormalizeVoiceOptions = {}): string {
  return normalizeVoicePhrase(text, options).normalize('NFD').replace(/\p{M}/gu, '').replace(/'/g, '').replace(/\s+/g, ' ').trim();
}

import { inject, Injectable } from '@angular/core';
import { INTENT_MIN_CONFIDENCE, LanguageIntentCatalog, LIA_INTENT_CATALOGS, MultilingualIntentEntry } from './lia-multilingual-intents';
import { LiaLanguageCode, MULTILINGUAL_INTENTS, MultilingualIntent } from './language.models';
import { loosePhrase, normalizeVoicePhrase } from './normalize-voice-phrase';

export type IntentMatchKind = 'exact' | 'alias' | 'vosk-variant' | 'contains' | 'fuzzy';

export interface MultilingualIntentMatch {
  language: LiaLanguageCode;
  intent: MultilingualIntent;
  /** 0–1. Las coincidencias aproximadas nunca pasan de 0,89. */
  confidence: number;
  matchedBy: IntentMatchKind;
  /** Frase del catálogo con la que coincidió. */
  phrase: string;
  /** Confianza mínima de la intención (HELP es más estricta). */
  threshold: number;
  accepted: boolean;
}

const SCORES = { exact: 1, alias: 0.97, looseExact: 0.95, voskVariant: 0.92, contains: 0.91, containsVariant: 0.9, fuzzyMax: 0.89 } as const;

/** Similitud 0–1 basada en la distancia de edición entre dos frases ya normalizadas. */
export function phraseSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

const containsWords = (text: string, phrase: string) => ` ${text} `.includes(` ${phrase} `);
const wordCount = (text: string) => (text ? text.split(' ').length : 0);

/** Mejor puntuación de un texto contra una entrada del catálogo. */
export function scoreIntentEntry(input: string, entry: MultilingualIntentEntry): { confidence: number; matchedBy: IntentMatchKind; phrase: string } | null {
  const strict = normalizeVoicePhrase(input, { stripWakeWord: true });
  const loose = loosePhrase(input, { stripWakeWord: true });
  if (!strict) return null;
  const typed = [entry.canonicalInput, ...entry.aliases].map((phrase) => ({
    phrase, strict: normalizeVoicePhrase(phrase, { stripWakeWord: true }), loose: loosePhrase(phrase, { stripWakeWord: true }), canonical: phrase === entry.canonicalInput,
  }));
  const variants = entry.voskVariants.map((phrase) => ({ phrase, loose: loosePhrase(phrase, { stripWakeWord: true }) }));

  for (const candidate of typed) {
    if (strict === candidate.strict) return { confidence: candidate.canonical ? SCORES.exact : SCORES.alias, matchedBy: candidate.canonical ? 'exact' : 'alias', phrase: candidate.phrase };
  }
  for (const candidate of typed) {
    if (loose === candidate.loose) return { confidence: SCORES.looseExact, matchedBy: candidate.canonical ? 'exact' : 'alias', phrase: candidate.phrase };
  }
  for (const variant of variants) {
    if (loose === variant.loose) return { confidence: SCORES.voskVariant, matchedBy: 'vosk-variant', phrase: variant.phrase };
  }
  for (const candidate of typed) {
    if (wordCount(candidate.loose) >= 2 && containsWords(loose, candidate.loose)) return { confidence: SCORES.contains, matchedBy: 'contains', phrase: candidate.phrase };
  }
  for (const variant of variants) {
    if (wordCount(variant.loose) >= 3 && containsWords(loose, variant.loose)) return { confidence: SCORES.containsVariant, matchedBy: 'contains', phrase: variant.phrase };
  }
  let best: { confidence: number; phrase: string } | null = null;
  for (const candidate of [...typed, ...variants]) {
    const similarity = phraseSimilarity(loose, candidate.loose) * SCORES.fuzzyMax;
    if (!best || similarity > best.confidence) best = { confidence: similarity, phrase: candidate.phrase };
  }
  return best && best.confidence > 0 ? { ...best, matchedBy: 'fuzzy' } : null;
}

/**
 * Reconoce las intenciones multilingües de LIA sobre texto escrito o transcrito (Vosk español en los pilotos).
 * Cada idioma usa su propio catálogo. Con confianza por debajo del umbral NO se ejecuta nada.
 */
@Injectable({ providedIn: 'root' })
export class MultilingualVoiceIntentMatcher {
  private readonly catalogs = inject(LIA_INTENT_CATALOGS);

  /** Mejor candidato del idioma aunque no alcance el umbral (para el registro de desarrollo). */
  evaluate(text: string, language: LiaLanguageCode): MultilingualIntentMatch | null {
    return evaluateIntent(this.catalogs, text, language);
  }

  /** Intención aceptada (confianza ≥ umbral) o null. */
  match(text: string, language: LiaLanguageCode): MultilingualIntentMatch | null {
    const best = this.evaluate(text, language);
    return best?.accepted ? best : null;
  }

  /** Mejor coincidencia aceptada entre varios idiomas (para identificar la lengua de un texto escrito). */
  matchAny(text: string, languages: readonly LiaLanguageCode[]): MultilingualIntentMatch | null {
    return languages.map((language) => this.match(text, language)).filter((match) => !!match)
      .sort((a, b) => b!.confidence - a!.confidence)[0] ?? null;
  }
}

/** Mejor candidato de `language` en los catálogos dados (función pura: la usan el servicio y el léxico por defecto). */
export function evaluateIntent(
  catalogs: Readonly<Partial<Record<LiaLanguageCode, LanguageIntentCatalog>>>,
  text: string,
  language: LiaLanguageCode,
): MultilingualIntentMatch | null {
  let best: MultilingualIntentMatch | null = null;
  for (const intent of MULTILINGUAL_INTENTS) {
    const entry = catalogs[language]?.intents[intent];
    const score = entry ? scoreIntentEntry(text, entry) : null;
    if (!score || (best && score.confidence <= best.confidence)) continue;
    const threshold = INTENT_MIN_CONFIDENCE[intent];
    best = { language, intent, ...score, threshold, accepted: score.confidence >= threshold };
  }
  return best;
}

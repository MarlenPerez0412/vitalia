import { inject, Injectable } from '@angular/core';
import { LiaLanguageCode, MultilingualIntent, VariantId } from '../../../core/i18n/language.models';
import { LIA_MULTILINGUAL_INTENTS } from '../../../core/i18n/lia-multilingual-intents';
import { evaluateIntent, IntentMatchKind, MultilingualVoiceIntentMatcher } from '../../../core/i18n/multilingual-voice-intent-matcher';
import { normalizeVoicePhrase } from '../../../core/i18n/normalize-voice-phrase';
import { normalizeText } from '../../../core/utils/text-normalize';
import { LiaIntent } from '../models/senior.models';

export type GlobalVoiceCommandIntent =
  | 'EMERGENCY_HELP'
  | 'EMERGENCY_SICK'
  | 'EMERGENCY_FALL'
  | 'CALL_PRIMARY_CONTACT'
  | 'CALL_DAUGHTER'
  | 'OPEN_EMERGENCY'
  | 'OPEN_LOCATION'
  | 'NEXT_MEDICATION'
  | 'CANCEL'
  | 'CONFIRM'
  | 'UNKNOWN';

export interface LexiconMatch<T> {
  intent: T;
  confidence: number;
  matchedBy: 'regex' | IntentMatchKind;
}

/**
 * Formas de decir las intenciones en un idioma. Las intenciones y la lógica que las ejecuta son las mismas para
 * todas las lenguas: el léxico solo cambia la entrada.
 */
export interface IntentLexicon {
  variant: VariantId;
  normalize(text: string): string;
  /** Longitud del prefijo de activación ("LIA, ...") al inicio del texto normalizado, o null. */
  wakePrefix(normalized: string): number | null;
  answer(command: string): 'CONFIRM' | 'CANCEL' | null;
  /** Intención dentro de la pantalla de LIA (null si no se reconoce con confianza suficiente). */
  liaIntent(normalized: string): LexiconMatch<LiaIntent> | null;
  /** Intención de un comando global, ya sin la palabra de activación (null si no se reconoce). */
  globalIntent(command: string): LexiconMatch<GlobalVoiceCommandIntent> | null;
  /** Petición explícita de cambiar el idioma de la conversación ("habla en español"), o null. */
  languageSwitch(normalized: string): LiaLanguageCode | null;
}

/**
 * Formas en que Vosk transcribe "LIA"/"Lía" (calibrado con voz real es-MX: "lia", "lía") y variantes cercanas.
 * Se evitan palabras comunes ("día", "tía", "mía") para no activar comandos por conversaciones ajenas.
 */
const ES_WAKE_PATTERN = /^(?:(?:oye|hola|ey|oiga|por favor)\s+)?(?:lia|lea|leah|lya|lila|ilia|elia)\b\s*/;
const ES_CONFIRM_PATTERN = /^(?:si|sí|si por favor|confirmo|confirmar|de acuerdo|claro|adelante|solicitar ayuda|solicita ayuda|pide ayuda|pedir ayuda|hazlo)$/;
const ES_CANCEL_PATTERN = /^(?:no|no gracias|cancela|cancelar|cancelalo|detente|alto|para|olvidalo|ya no|estoy bien)$/;

/** Orden: lo más específico y urgente primero ("contacto de emergencia" antes que "emergencia"). */
const ES_GLOBAL_RULES: readonly (readonly [GlobalVoiceCommandIntent, RegExp])[] = [
  ['CALL_PRIMARY_CONTACT', /\b(llama|llamar|marca|marcale|comunicame)\b.*\bcontacto( de emergencia)?\b/],
  ['CALL_DAUGHTER', /\b(llama|llamar|llamale|marca|marcale|comunicame|hablar)\b.*\bhija\b/],
  ['EMERGENCY_FALL', /\b(me cai|me caigo|me he caido|me acabo de caer|sufri una caida)\b/],
  ['EMERGENCY_SICK', /\b(me siento mal|no me siento bien|me siento muy mal|me siento enferma|me siento enfermo|me duele|estoy enferma|estoy enfermo|me mareo|estoy mareada|estoy mareado)\b/],
  ['EMERGENCY_HELP', /\b(necesito ayuda|ayuda|ayudame|auxilio|socorro|pide ayuda|pedir ayuda|emergencia medica)\b/],
  // Vosk transcribe a veces "abre" como "habrá"/"abra" (calibrado con audio real del navegador).
  ['OPEN_EMERGENCY', /\b(abre|abra|habra|abrir|abreme|ve a|ir a|llevame a|muestrame|pantalla de)\b.*\bemergencias?\b|^emergencias?$/],
  ['OPEN_LOCATION', /\b(donde estoy|mi ubicacion|ubicacion|mapa|en donde estoy)\b/],
  ['NEXT_MEDICATION', /\b(que medicamento|medicamento me toca|que medicina|que pastilla|me toca tomar|mi medicamento|mis medicamentos|que medicacion|medicacion estoy tomando)\b/],
  ['CANCEL', /\b(cancela|cancelar|detente|olvidalo)\b/],
];

/** Orden de evaluación en la pantalla de LIA: las intenciones más específicas o urgentes primero. */
const ES_LIA_RULES: readonly (readonly [LiaIntent, RegExp])[] = [
  ['START_EMERGENCY', /\b(ayuda|emergencia|me cai|auxilio|me siento muy mal)\b/],
  ['MEDICATION_TAKEN', /\b(ya )?(me )?(tome|tomado|tomada)\b.*\b(medicamento|medicina|pastilla|pastillas)\b|\bya (me la|lo|la) tome\b/],
  ['OPEN_LOCATION', /\b(ubicacion|donde estoy|mapa)\b/],
  // Pedir que LIA llame a la hija (abre la confirmacion de llamada); "hablar con mi hija" sigue abriendo Familia.
  ['CALL_DAUGHTER', /\b(llama|llamar|llamale|marca|marcale|comunicame)\b.*\bhija\b/],
  ['CALL_FAMILY', /\b(hija|hijo|ana|familia|llamar|llama)\b/],
  ['START_CHECKIN', /\b(check ?in|como me siento|registrar como estoy|bienestar|mi dia)\b/],
  ['PENSION_INFO', /\b(pension|depositan|deposito)\b/],
  ['MEMORY_ACTIVITY', /\b(memoria|ejercicio|ejercicios)\b/],
  ['NEXT_MEDICATION', /\b(medicamento|medicacion|medicina|pastilla|me toca)\b/],
];

/** "Habla en español", "respóndeme en náhuatl", "sigamos en zapoteco"... */
const LANGUAGE_SWITCH = /\b(habla|hablame|hablemos|responde|respondeme|contesta|contestame|sigamos|seguimos|cambia|cambiemos|quiero)\b.*\ben (espanol|castellano|nahuatl|mexicano|zapoteco)\b/;
const SWITCH_TARGET: Readonly<Record<string, LiaLanguageCode>> = { espanol: 'es', castellano: 'es', nahuatl: 'nahuatl-pilot', mexicano: 'nahuatl-pilot', zapoteco: 'zapoteco-pilot' };

/** Correspondencia entre las intenciones multilingües y las intenciones existentes. */
const LIA_INTENT_OF: Readonly<Record<MultilingualIntent, LiaIntent>> = { NEXT_MEDICATION: 'NEXT_MEDICATION', HELP: 'START_EMERGENCY', CALL_DAUGHTER: 'CALL_DAUGHTER' };
const GLOBAL_INTENT_OF: Readonly<Record<MultilingualIntent, GlobalVoiceCommandIntent>> = { NEXT_MEDICATION: 'NEXT_MEDICATION', HELP: 'EMERGENCY_HELP', CALL_DAUGHTER: 'CALL_DAUGHTER' };

const regexMatch = <T>(rules: readonly (readonly [T, RegExp])[], text: string): LexiconMatch<T> | null => {
  const rule = rules.find(([, pattern]) => pattern.test(text));
  return rule ? { intent: rule[0], confidence: 1, matchedBy: 'regex' } : null;
};

const answerOf = (command: string): 'CONFIRM' | 'CANCEL' | null => {
  const plain = normalizeText(command);
  if (ES_CONFIRM_PATTERN.test(plain)) return 'CONFIRM';
  return ES_CANCEL_PATTERN.test(plain) ? 'CANCEL' : null;
};

/** Léxico de un idioma: reglas propias (español) y, para todos, el catálogo multilingüe con su umbral de confianza. */
function buildLexicon(variant: LiaLanguageCode, matcher: Pick<MultilingualVoiceIntentMatcher, 'match'>): IntentLexicon {
  const spanish = variant === 'es';
  const catalogMatch = <T>(text: string, map: Readonly<Record<MultilingualIntent, T>>): LexiconMatch<T> | null => {
    const match = matcher.match(text, variant);
    return match ? { intent: map[match.intent], confidence: match.confidence, matchedBy: match.matchedBy } : null;
  };
  return {
    variant,
    normalize: spanish ? normalizeText : (text) => normalizeVoicePhrase(text),
    wakePrefix: (normalized) => ES_WAKE_PATTERN.exec(normalizeText(normalized))
      ? normalized.length - normalizeVoicePhrase(normalized, { stripWakeWord: true }).length
      : null,
    answer: answerOf,
    liaIntent: (text) => (spanish ? regexMatch(ES_LIA_RULES, normalizeText(text)) : null) ?? catalogMatch(text, LIA_INTENT_OF),
    globalIntent: (command) => (spanish ? regexMatch(ES_GLOBAL_RULES, normalizeText(command)) : null) ?? catalogMatch(command, GLOBAL_INTENT_OF),
    // Solo hay frase de cambio de idioma en español; en los pilotos se usa el botón (o la frase en español).
    languageSwitch: (normalized) => (spanish ? SWITCH_TARGET[LANGUAGE_SWITCH.exec(normalizeText(normalized))?.[2] ?? ''] ?? null : null),
  };
}

/** Léxico español con el catálogo por defecto, para usos sin inyección (p. ej. el parser sin opciones). */
export const SPANISH_LEXICON: IntentLexicon = buildLexicon('es', {
  match: (text, language) => { const best = evaluateIntent(LIA_MULTILINGUAL_INTENTS, text, language); return best?.accepted ? best : null; },
});

/** Léxico de cada idioma (un solo matcher y una sola tabla de intenciones para todos). */
@Injectable({ providedIn: 'root' })
export class IntentLexiconService {
  private readonly matcher = inject(MultilingualVoiceIntentMatcher);
  private readonly lexicons = new Map<LiaLanguageCode, IntentLexicon>();

  forVariant(variant: LiaLanguageCode): IntentLexicon {
    let lexicon = this.lexicons.get(variant);
    if (!lexicon) { lexicon = buildLexicon(variant, this.matcher); this.lexicons.set(variant, lexicon); }
    return lexicon;
  }

  /** Léxicos a probar para una entrada en `variant`: el suyo y, si es un piloto, también el español. */
  chainFor(variant: LiaLanguageCode): readonly IntentLexicon[] {
    return variant === 'es' ? [this.forVariant('es')] : [this.forVariant(variant), this.forVariant('es')];
  }
}

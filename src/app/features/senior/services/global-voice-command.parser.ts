import { VariantId } from '../../../core/i18n/language.models';
import { GlobalVoiceCommandIntent, IntentLexicon, LexiconMatch, SPANISH_LEXICON } from './intent-lexicon';

export type { GlobalVoiceCommandIntent } from './intent-lexicon';

export interface GlobalVoiceCommand {
  intent: GlobalVoiceCommandIntent;
  /** Texto normalizado después de la palabra de activación. */
  command: string;
  wakeWord: boolean;
  /** Idioma en que se reconoció la frase: la respuesta sale en el mismo. */
  variant: VariantId;
  /** 1 para reglas y respuestas; la del catálogo multilingüe en otro caso; null si no se reconoció. */
  confidence: number | null;
  matchedBy: LexiconMatch<GlobalVoiceCommandIntent>['matchedBy'] | null;
}

/**
 * Interpreta una transcripción. Devuelve `null` si no va dirigida a VITALIA (sin "LIA"): esas frases se descartan
 * sin mostrarse. Si hay una pregunta pendiente, "sí"/"cancelar" valen sin "LIA". Se prueban los léxicos en orden
 * (idioma activo y, si es un piloto, también español; por defecto, solo español); las intenciones son las mismas en todos.
 */
export function parseGlobalVoiceCommand(
  transcript: string,
  options: { awaitingAnswer?: boolean; lexicons?: readonly IntentLexicon[] } = {},
): GlobalVoiceCommand | null {
  const lexicons = options.lexicons ?? [SPANISH_LEXICON];
  const [primary] = lexicons;
  const parsed = lexicons.map((lexicon) => {
    const normalized = lexicon.normalize(transcript);
    const wake = normalized ? lexicon.wakePrefix(normalized) : null;
    return { lexicon, wake, command: wake !== null ? normalized.slice(wake).trim() : normalized };
  });
  if (!parsed[0]?.command && parsed[0]?.wake === null) return null;
  const woke = parsed.some((item) => item.wake !== null);

  for (const { lexicon, command } of parsed) {
    const answer = lexicon.answer(command);
    if (answer && (woke || options.awaitingAnswer)) return { intent: answer, command, wakeWord: woke, variant: primary.variant, confidence: 1, matchedBy: 'regex' };
  }
  if (!woke) return null;
  for (const { lexicon, command } of parsed) {
    const match = command ? lexicon.globalIntent(command) : null;
    if (match) return { intent: match.intent, command, wakeWord: true, variant: lexicon.variant, confidence: match.confidence, matchedBy: match.matchedBy };
  }
  return { intent: 'UNKNOWN', command: parsed[0].command, wakeWord: true, variant: primary.variant, confidence: null, matchedBy: null };
}

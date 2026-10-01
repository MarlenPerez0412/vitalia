import esMX from './catalogs/es-MX.json';

/** Idiomas de LIA. Náhuatl y zapoteco son variantes PILOTO: frases predeterminadas para el MVP, sin validación nativa. */
export type LiaLanguageCode = 'es' | 'nahuatl-pilot' | 'zapoteco-pilot';
/** Alias interno: la variante de una entrada o respuesta es su código de idioma de LIA. */
export type VariantId = LiaLanguageCode;
/** Familia lingüística (agrupa variantes futuras). */
export type LanguageId = 'es' | 'nahuatl' | 'zapoteco';

export const LIA_LANGUAGE_CODES: readonly LiaLanguageCode[] = ['es', 'nahuatl-pilot', 'zapoteco-pilot'];

/** Mensajes generales de LIA (catálogo español). */
export type MessageKey = keyof typeof esMX.messages;

/** Intenciones con frases predeterminadas en los tres idiomas. */
export const MULTILINGUAL_INTENTS = ['NEXT_MEDICATION', 'HELP', 'CALL_DAUGHTER'] as const;
export type MultilingualIntent = (typeof MULTILINGUAL_INTENTS)[number];

/** Textos que salen del catálogo multilingüe de intenciones (respuesta y confirmación de cada intención). */
export type IntentMessageKey = `intent.${MultilingualIntent}.${'response' | 'confirmation'}`;
export type PhraseKey = MessageKey | IntentMessageKey;

export interface SpanishCatalog {
  variant: 'es';
  messages: Readonly<Record<MessageKey, string>>;
}

/**
 * Texto listo para mostrar o decir. Si la variante no tiene esa cadena, `available` es false, `text` es el español
 * y `fallbackText` también: la interfaz lo marca como respaldo. `nativeValidation` es false en las variantes piloto.
 */
export interface LocalizedText {
  key: PhraseKey;
  variant: VariantId;
  text: string;
  available: boolean;
  fallbackText: string | null;
  nativeValidation: boolean;
}

import { normalizeText } from '../../../core/utils/text-normalize';

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

export interface GlobalVoiceCommand {
  intent: GlobalVoiceCommandIntent;
  /** Texto normalizado despues de la palabra de activacion. */
  command: string;
  wakeWord: boolean;
}

/**
 * Formas en que Vosk transcribe "LIA"/"Lía" (calibrado con voz real es-MX: "lia", "lía") y variantes cercanas.
 * Se evitan palabras comunes ("día", "tía", "mía") para no activar comandos por conversaciones ajenas.
 */
const WAKE_PATTERN = /^(?:(?:oye|hola|ey|oiga|por favor)\s+)?(?:lia|lea|leah|lya|lila|ilia|elia)\b\s*/;

const CONFIRM_PATTERN = /^(?:si|sí|si por favor|confirmo|confirmar|de acuerdo|claro|adelante|solicitar ayuda|solicita ayuda|pide ayuda|pedir ayuda|hazlo)$/;
const CANCEL_PATTERN = /^(?:no|no gracias|cancela|cancelar|cancelalo|detente|alto|para|olvidalo|ya no|estoy bien)$/;

/** Orden: lo mas especifico y urgente primero ("contacto de emergencia" antes que "emergencia"). */
const INTENT_RULES: readonly (readonly [GlobalVoiceCommandIntent, RegExp])[] = [
  ['CALL_PRIMARY_CONTACT', /\b(llama|llamar|marca|marcale|comunicame)\b.*\bcontacto( de emergencia)?\b/],
  ['CALL_DAUGHTER', /\b(llama|llamar|marca|marcale|comunicame|hablar)\b.*\bhija\b/],
  ['EMERGENCY_FALL', /\b(me cai|me caigo|me he caido|me acabo de caer|sufri una caida)\b/],
  ['EMERGENCY_SICK', /\b(me siento mal|no me siento bien|me siento muy mal|me siento enferma|me siento enfermo|me duele|estoy enferma|estoy enfermo|me mareo|estoy mareada|estoy mareado)\b/],
  ['EMERGENCY_HELP', /\b(necesito ayuda|ayuda|ayudame|auxilio|socorro|pide ayuda|pedir ayuda|emergencia medica)\b/],
  // Vosk transcribe a veces "abre" como "habrá"/"abra" (calibrado con audio real del navegador).
  ['OPEN_EMERGENCY', /\b(abre|abra|habra|abrir|abreme|ve a|ir a|llevame a|muestrame|pantalla de)\b.*\bemergencias?\b|^emergencias?$/],
  ['OPEN_LOCATION', /\b(donde estoy|mi ubicacion|ubicacion|mapa|en donde estoy)\b/],
  ['NEXT_MEDICATION', /\b(que medicamento|medicamento me toca|que medicina|que pastilla|me toca tomar|mi medicamento|mis medicamentos)\b/],
  ['CANCEL', /\b(cancela|cancelar|detente|olvidalo)\b/],
];

/**
 * Interpreta una transcripcion de Vosk. Devuelve `null` si no va dirigida a VITALIA (sin "LIA"):
 * esas frases se descartan sin mostrarse. Si hay una pregunta pendiente, "si"/"cancelar" valen sin "LIA".
 */
export function parseGlobalVoiceCommand(transcript: string, options: { awaitingAnswer?: boolean } = {}): GlobalVoiceCommand | null {
  const normalized = normalizeText(transcript);
  if (!normalized) return null;
  const wake = WAKE_PATTERN.exec(normalized);
  const command = wake ? normalized.slice(wake[0].length).trim() : normalized;

  if (!wake) {
    if (!options.awaitingAnswer) return null;
    const answer = answerIntent(command);
    return answer ? { intent: answer, command, wakeWord: false } : null;
  }
  const answer = answerIntent(command);
  if (answer) return { intent: answer, command, wakeWord: true };
  const intent = INTENT_RULES.find(([, pattern]) => pattern.test(command))?.[0] ?? 'UNKNOWN';
  return { intent, command, wakeWord: true };
}

function answerIntent(command: string): 'CONFIRM' | 'CANCEL' | null {
  if (CONFIRM_PATTERN.test(command)) return 'CONFIRM';
  if (CANCEL_PATTERN.test(command)) return 'CANCEL';
  return null;
}

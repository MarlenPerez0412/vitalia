/** Datos minimos de una toma para construir frases (estructural: no depende de los modelos de Senior). */
export interface SpokenMedicationData {
  name: string;
  dose: string;
  time: string;
}

/** Como se muestra (texto) o se dice (voz) un dato dinamico. */
export type PhraseMode = 'text' | 'speech';

/** Formateo de datos dinamicos (dosis, hora) por idioma y modo. */
export interface PhraseFormatter {
  dose(dose: string, mode: PhraseMode): string;
  time(time: string, mode: PhraseMode): string;
  /** Ajustes gramaticales finales sobre la frase ya armada. */
  finish(text: string, mode: PhraseMode): string;
}

const SPOKEN_UNITS: Readonly<Record<string, string>> = { mg: 'miligramos', g: 'gramos', mcg: 'microgramos', ml: 'mililitros', ui: 'unidades' };

/**
 * "10:00 AM", "10:00 a.m.", "10:00 a. m." -> "las 10 de la mañana"; "2:30 PM" o "14:30" -> "las 2 y 30 de la tarde".
 * Acepta el formato del locale es-MX (con espacios finos) y el de 24 horas.
 */
export function spokenTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})(?:\s*([ap])\.?\s*m\.?)?$/i.exec(time.replace(/[\u00a0\u202f]/g, ' ').trim());
  if (!match) return `las ${time}`;
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  const hour24 = meridiem ? (Number(match[1]) % 12) + (meridiem === 'p' ? 12 : 0) : Number(match[1]) % 24;
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = hour24 < 12 ? 'de la mañana' : hour24 === 12 ? 'del día' : hour24 < 19 ? 'de la tarde' : 'de la noche';
  return `${hour === 1 ? 'la 1' : `las ${hour}`}${minutes ? ` y ${minutes}` : ''} ${period}`;
}

/** "Metformina", "500 mg · Con alimentos", "10:00 AM" -> "Metformina de 500 miligramos a las 10 de la mañana". */
export function spokenMedication(medication: SpokenMedicationData): string {
  const dose = medication.dose.split('·')[0].trim();
  const amount = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)$/.exec(dose);
  const unit = amount && SPOKEN_UNITS[amount[2].toLowerCase()];
  const detail = unit ? ` de ${amount![1]} ${unit}` : dose ? `, ${dose},` : '';
  return `${medication.name}${detail} a ${spokenTime(medication.time)}`;
}

/** "500 mg · Con alimentos" -> "500 miligramos"; "1 cápsula" se deja igual. */
export function spokenDose(dose: string): string {
  const value = dose.split('·')[0].trim();
  const amount = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)$/.exec(value);
  const unit = amount && SPOKEN_UNITS[amount[2].toLowerCase()];
  return unit ? `${amount![1]} ${unit}` : value;
}

/** Hora sin articulo para plantillas que ya lo llevan ("a las {time}"): "10 de la mañana". */
export function spokenTimeBare(time: string): string {
  return spokenTime(time).replace(/^las? /, '');
}

/** Espanol: en pantalla, el dato tal como lo da el estado; en voz, unidades y horas dichas con palabras. */
export const ES_MX_FORMATTER: PhraseFormatter = {
  dose: (dose, mode) => (mode === 'speech' ? spokenDose(dose) : dose.split('·')[0].trim()),
  time: (time, mode) => (mode === 'speech' ? spokenTimeBare(time) : time),
  // "a las 1 de la tarde" -> "a la 1 de la tarde".
  finish: (text, mode) => (mode === 'speech' ? text.replace(/a las 1 /g, 'a la 1 ') : text),
};

/**
 * Variantes piloto: los datos se insertan tal cual (dosis, unidades y horas con numeros), sin traducirlos;
 * son los "terminos tecnicos inevitables" que se admiten dentro de una respuesta en otra lengua.
 */
export const PILOT_FORMATTER: PhraseFormatter = {
  dose: (dose) => dose.split('·')[0].trim(),
  time: (time) => time,
  finish: (text) => text,
};

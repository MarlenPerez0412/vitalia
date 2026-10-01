/**
 * Minusculas, sin tildes ni signos y con espacios simples. El texto de Vosk no trae puntuacion
 * y el escrito si; ambos se comparan en esta forma (LIA y comandos globales de voz).
 */
export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

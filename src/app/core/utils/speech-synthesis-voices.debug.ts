/**
 * Diagnostico temporal de voces TTS del navegador.
 *
 * Este archivo no esta importado por la aplicacion ni modifica la logica de voz
 * existente. Puede eliminarse completo cuando termine la comprobacion.
 */
export interface SpeechSynthesisVoiceInfo {
  readonly name: string;
  readonly lang: string;
  readonly voiceURI: string;
  readonly default: boolean;
  readonly localService: boolean;
}

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export async function listSpeechSynthesisVoices(
  timeoutMs = 1_000,
): Promise<readonly SpeechSynthesisVoiceInfo[]> {
  if (!isSpeechSynthesisAvailable()) return [];

  const synthesis = window.speechSynthesis;
  let voices = synthesis.getVoices();

  if (voices.length === 0) {
    voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const timeout = window.setTimeout(() => {
        synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(synthesis.getVoices());
      }, timeoutMs);

      const handleVoicesChanged = (): void => {
        window.clearTimeout(timeout);
        synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(synthesis.getVoices());
      };

      synthesis.addEventListener('voiceschanged', handleVoicesChanged);
    });
  }

  const availableVoices = voices.map(({ name, lang, voiceURI, default: isDefault, localService }) => ({
    name,
    lang,
    voiceURI,
    default: isDefault,
    localService,
  }));

  console.table(availableVoices);
  return availableVoices;
}

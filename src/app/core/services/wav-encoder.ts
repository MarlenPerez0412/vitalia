const TARGET_RATE = 16000;

/**
 * Convierte la grabacion de MediaRecorder (webm/opus, mp4...) a WAV PCM 16 bit, mono, 16 kHz con Web Audio.
 * Es el formato nativo de Vosk, asi el backend no necesita FFmpeg para el caso habitual.
 * Devuelve null si el navegador no puede decodificar el audio; entonces se envia el original.
 */
export async function encodeWav16kMono(blob: Blob): Promise<Blob | null> {
  const OfflineContext = globalThis.OfflineAudioContext;
  if (typeof OfflineContext !== 'function' || typeof blob.arrayBuffer !== 'function') return null;
  try {
    // Un contexto offline minimo basta para decodificar sin abrir la salida de audio.
    const decoded = await new OfflineContext(1, 1, TARGET_RATE).decodeAudioData(await blob.arrayBuffer());
    const length = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
    const context = new OfflineContext(1, length, TARGET_RATE);
    const source = context.createBufferSource();
    source.buffer = decoded;
    source.connect(context.destination);
    source.start();
    const rendered = await context.startRendering();
    return new Blob([pcm16Wav(rendered.getChannelData(0), TARGET_RATE)], { type: 'audio/wav' });
  } catch {
    return null;
  }
}

/** PCM 16 bit mono en contenedor WAV (formato nativo de Vosk). */
export function pcm16Wav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  write(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); write(8, 'WAVE');
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return buffer;
}

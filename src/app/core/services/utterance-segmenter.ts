export interface SegmenterOptions {
  sampleRate: number;
  frameMs: number;
  /** Audio previo al inicio detectado que se conserva para no cortar la primera silaba ("LIA"). */
  preRollMs: number;
  /** Voz minima para considerar una frase: admite respuestas cortas ("sí", "no") y descarta chasquidos. */
  minSpeechMs: number;
  /** Silencio que cierra la frase. */
  endSilenceMs: number;
  maxUtteranceMs: number;
  /** Umbral RMS minimo; se eleva automaticamente con el ruido de fondo. */
  minThreshold: number;
  noiseMultiplier: number;
}

const DEFAULTS: SegmenterOptions = {
  sampleRate: 16000, frameMs: 30, preRollMs: 400, minSpeechMs: 150, endSilenceMs: 800, maxUtteranceMs: 8000, minThreshold: 0.012, noiseMultiplier: 3,
};

/**
 * Deteccion de actividad de voz (VAD) por energia, 100 % local. Recibe PCM mono y entrega solo los tramos hablados;
 * el silencio y el ruido nunca salen del navegador. Sin dependencias del DOM para poder probarse.
 */
export class UtteranceSegmenter {
  private readonly options: SegmenterOptions;
  private readonly frameSize: number;
  private readonly preRollFrames: number;
  private pending = new Float32Array(0);
  private preRoll: Float32Array[] = [];
  private current: Float32Array[] | null = null;
  private speechMs = 0;
  private silenceMs = 0;
  private totalMs = 0;
  private noiseFloor = 0.004;

  constructor(private readonly onUtterance: (samples: Float32Array) => void, options: Partial<SegmenterOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
    this.frameSize = Math.round(this.options.sampleRate * this.options.frameMs / 1000);
    this.preRollFrames = Math.ceil(this.options.preRollMs / this.options.frameMs);
  }

  get speaking(): boolean { return this.current !== null; }

  push(samples: Float32Array): void {
    const joined = new Float32Array(this.pending.length + samples.length);
    joined.set(this.pending);
    joined.set(samples, this.pending.length);
    let offset = 0;
    for (; offset + this.frameSize <= joined.length; offset += this.frameSize) this.processFrame(joined.subarray(offset, offset + this.frameSize));
    this.pending = joined.slice(offset);
  }

  /** Cierra la frase en curso (p. ej. al pausar la escucha). */
  flush(): void { if (this.current) this.finish(); }

  reset(): void {
    this.pending = new Float32Array(0);
    this.preRoll = [];
    this.current = null;
    this.speechMs = this.silenceMs = this.totalMs = 0;
  }

  private processFrame(frame: Float32Array): void {
    const copy = frame.slice();
    const level = rms(copy);
    const threshold = Math.max(this.options.minThreshold, this.noiseFloor * this.options.noiseMultiplier);
    const { frameMs } = this.options;

    if (!this.current) {
      if (level > threshold) {
        this.current = [...this.preRoll, copy];
        this.preRoll = [];
        this.speechMs = frameMs;
        this.silenceMs = 0;
        this.totalMs = (this.current.length) * frameMs;
        return;
      }
      this.noiseFloor = this.noiseFloor * 0.95 + level * 0.05;
      this.preRoll.push(copy);
      if (this.preRoll.length > this.preRollFrames) this.preRoll.shift();
      return;
    }

    this.current.push(copy);
    this.totalMs += frameMs;
    // Histeresis: entre palabras la energia baja; se sigue considerando voz con un umbral menor.
    if (level > threshold * 0.6) { this.speechMs += frameMs; this.silenceMs = 0; }
    else this.silenceMs += frameMs;
    if (this.silenceMs >= this.options.endSilenceMs || this.totalMs >= this.options.maxUtteranceMs) this.finish();
  }

  private finish(): void {
    const frames = this.current ?? [];
    const speechMs = this.speechMs;
    this.current = null;
    this.speechMs = this.silenceMs = this.totalMs = 0;
    if (speechMs < this.options.minSpeechMs) return;
    const length = frames.reduce((sum, frame) => sum + frame.length, 0);
    const samples = new Float32Array(length);
    let offset = 0;
    for (const frame of frames) { samples.set(frame, offset); offset += frame.length; }
    this.onUtterance(samples);
  }
}

function rms(frame: Float32Array): number {
  let sum = 0;
  for (const value of frame) sum += value * value;
  return Math.sqrt(sum / (frame.length || 1));
}

/** Reduce a `outputRate` promediando (filtro paso bajo simple, suficiente para voz). */
export function downsample(input: Float32Array, inputRate: number, outputRate = 16000): Float32Array {
  if (inputRate === outputRate) return input.slice();
  const ratio = inputRate / outputRate;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let cursor = start; cursor < end; cursor++) sum += input[cursor];
    output[index] = sum / Math.max(1, end - start);
  }
  return output;
}

import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { AudioCaptureStatus, AudioRecording } from '../models/permission.models';
import { PermissionsService } from './permissions.service';
import { downsample, UtteranceSegmenter } from './utterance-segmenter';
import { pcm16Wav } from './wav-encoder';

const MAX_RECORDING_MS = 60000;
const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'] as const;
const VOSK_RATE = 16000;
/** Procesador AudioWorklet en linea: agrupa bloques de 128 muestras y los envia al hilo principal. */
const WORKLET_SOURCE = `class VitaliaCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buffer = new Float32Array(2048); this.length = 0; }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.length++] = channel[i];
        if (this.length === this.buffer.length) { this.port.postMessage(this.buffer.slice(0)); this.length = 0; }
      }
    }
    return true;
  }
}
registerProcessor('vitalia-capture', VitaliaCapture);`;

interface ContinuousSession {
  stream: MediaStream;
  context: AudioContext;
  nodes: AudioNode[];
  segmenter: UtteranceSegmenter;
}

/**
 * Unico punto de acceso al microfono. Dos modos, nunca simultaneos (lo coordina `VoiceSessionCoordinatorService`):
 * - `start/stop` (LIA): grabacion bajo demanda con MediaRecorder; `stop()` entrega un `AudioRecording` en memoria.
 * - `startContinuous/stopContinuous` (comandos de voz): escucha con deteccion local de voz; solo entrega los tramos
 *   hablados como WAV 16 kHz. El silencio no sale del navegador.
 * No transcribe, no persiste y no hace HTTP (eso es `VoiceApiService`). Todo se detiene al ocultar la pestana.
 */
@Injectable({ providedIn: 'root' })
export class AudioCaptureService {
  private readonly permissions = inject(PermissionsService);
  private readonly document = inject(DOCUMENT);
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private limitTimer?: ReturnType<typeof setTimeout>;
  private pendingStop?: (recording: AudioRecording | null) => void;

  private continuous: ContinuousSession | null = null;
  /** Invalida un `startContinuous` en curso si se detiene antes de terminar (permiso, AudioWorklet). */
  private continuousRequest = 0;

  readonly status = signal<AudioCaptureStatus>('idle');
  readonly errorMessage = signal('');
  /** Escucha continua activa (comandos de voz). */
  readonly continuousActive = signal(false);
  /** `true` mientras se detecta voz en modo continuo (indicador visual). */
  readonly hearingSpeech = signal(false);

  constructor() {
    const onVisibility = () => { if (this.document.visibilityState === 'hidden') { void this.stop(); this.stopContinuous(); } };
    this.document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => { this.document.removeEventListener('visibilitychange', onVisibility); this.release(); this.stopContinuous(); });
  }

  static isContinuousSupported(): boolean {
    return typeof globalThis.AudioContext === 'function';
  }

  static isRecordingSupported(): boolean { return typeof globalThis.MediaRecorder === 'function'; }

  /** Solicita el stream (lo que dispara el permiso del navegador si hace falta) e inicia la grabacion. */
  async start(): Promise<boolean> {
    if (this.status() === 'recording' || this.status() === 'requesting') return false;
    // Nunca dos capturas a la vez: el coordinador pausa la escucha continua antes de que LIA grabe.
    if (this.continuous) return this.fail('El micrófono está ocupado por los comandos de voz.');
    this.errorMessage.set('');
    if (!AudioCaptureService.isRecordingSupported()) {
      return this.fail('Tu navegador no permite grabar audio. Puedes escribir tu mensaje.');
    }
    this.status.set('requesting');
    const stream = await this.permissions.requestMicrophoneStream();
    if (!stream) {
      const state = this.permissions.microphone();
      return this.fail(state === 'denied' ? 'No tengo permiso para usar el micrófono.'
        : state === 'unavailable' ? 'No encontré un micrófono disponible.'
        : 'No pude activar el micrófono.');
    }
    // El usuario pudo cancelar mientras el navegador mostraba el permiso.
    if (this.status() !== 'requesting') { stream.getTracks().forEach((track) => track.stop()); return false; }
    try {
      this.stream = stream;
      this.chunks = [];
      const mimeType = PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.addEventListener('dataavailable', (event) => { if (recorder === this.recorder && event.data.size > 0) this.chunks.push(event.data); });
      recorder.addEventListener('stop', () => { if (recorder === this.recorder) this.finish(recorder); });
      this.recorder = recorder;
      recorder.start();
      this.startedAt = Date.now();
      this.limitTimer = setTimeout(() => void this.stop(), MAX_RECORDING_MS);
      this.status.set('recording');
      return true;
    } catch {
      this.release();
      return this.fail('No pude iniciar la grabación.');
    }
  }

  /** Detiene la grabacion, libera el microfono y devuelve el audio en memoria. */
  stop(): Promise<AudioRecording | null> {
    if (this.status() === 'requesting') { this.status.set('idle'); return Promise.resolve(null); }
    if (!this.recorder || this.recorder.state === 'inactive') { this.release(); return Promise.resolve(null); }
    return new Promise((resolve) => {
      this.pendingStop = resolve;
      this.recorder!.stop();
    });
  }

  /** Libera tracks y recorder sin producir grabacion. */
  release(): void {
    clearTimeout(this.limitTimer);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    // Se desvincula antes de detener para que el evento `stop` no produzca una grabacion descartada.
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    this.pendingStop?.(null);
    this.pendingStop = undefined;
    this.chunks = [];
    if (this.status() === 'recording' || this.status() === 'requesting') this.status.set('idle');
  }

  /**
   * Escucha continua con deteccion de voz local. Cada frase detectada se entrega como WAV 16 kHz mono.
   * Reutiliza el permiso del microfono de `PermissionsService`.
   */
  async startContinuous(onUtterance: (recording: AudioRecording) => void): Promise<boolean> {
    if (this.continuous) return true;
    if (this.status() === 'recording' || this.status() === 'requesting') return false;
    this.errorMessage.set('');
    if (!AudioCaptureService.isContinuousSupported()) return this.fail('Tu navegador no permite escuchar comandos de voz.');
    const request = ++this.continuousRequest;
    const stream = await this.permissions.requestMicrophoneStream();
    if (request !== this.continuousRequest) { stream?.getTracks().forEach((track) => track.stop()); return false; }
    if (!stream) {
      const state = this.permissions.microphone();
      return this.fail(state === 'denied' ? 'No tengo permiso para usar el micrófono.' : state === 'unavailable' ? 'No encontré un micrófono disponible.' : 'No pude activar el micrófono.');
    }
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
      const segmenter = new UtteranceSegmenter((samples) => onUtterance(this.toRecording(samples)));
      const rate = context.sampleRate;
      const handleFrame = (frame: Float32Array) => {
        segmenter.push(downsample(frame, rate, VOSK_RATE));
        if (this.hearingSpeech() !== segmenter.speaking) this.hearingSpeech.set(segmenter.speaking);
      };
      const source = context.createMediaStreamSource(stream);
      const processor = await this.createProcessor(context, handleFrame);
      if (request !== this.continuousRequest) throw new Error('cancelled');
      // Salida silenciada: algunos navegadores solo procesan nodos conectados al destino.
      const mute = context.createGain();
      mute.gain.value = 0;
      source.connect(processor);
      processor.connect(mute);
      mute.connect(context.destination);
      if (context.state === 'suspended') await context.resume();
      this.continuous = { stream, context, nodes: [source, processor, mute], segmenter };
      this.continuousActive.set(true);
      return true;
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      void context?.close();
      return request === this.continuousRequest ? this.fail('No pude iniciar la escucha de comandos de voz.') : false;
    }
  }

  /** Detiene la escucha continua y libera el microfono (la frase a medias se descarta). */
  stopContinuous(): void {
    this.continuousRequest++;
    const session = this.continuous;
    if (!session) return;
    this.continuous = null;
    session.segmenter.reset();
    session.nodes.forEach((node) => node.disconnect());
    session.stream.getTracks().forEach((track) => track.stop());
    void session.context.close();
    this.continuousActive.set(false);
    this.hearingSpeech.set(false);
  }

  private async createProcessor(context: AudioContext, onFrame: (frame: Float32Array) => void): Promise<AudioNode> {
    if (context.audioWorklet && typeof AudioWorkletNode === 'function') {
      const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
      try {
        await context.audioWorklet.addModule(url);
        const node = new AudioWorkletNode(context, 'vitalia-capture');
        node.port.onmessage = (event: MessageEvent<Float32Array>) => onFrame(event.data);
        return node;
      } catch {
        // Continua con el respaldo ScriptProcessor.
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const node = context.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = (event) => onFrame(event.inputBuffer.getChannelData(0).slice());
    return node;
  }

  private toRecording(samples: Float32Array): AudioRecording {
    return {
      blob: new Blob([pcm16Wav(samples, VOSK_RATE)], { type: 'audio/wav' }),
      mimeType: 'audio/wav',
      durationMs: Math.round(samples.length / VOSK_RATE * 1000),
      createdAt: new Date().toISOString(),
    };
  }

  private finish(recorder: MediaRecorder): void {
    const mimeType = recorder.mimeType || 'audio/webm';
    const recording: AudioRecording | null = this.chunks.length
      ? { blob: new Blob(this.chunks, { type: mimeType }), mimeType, durationMs: Date.now() - this.startedAt, createdAt: new Date().toISOString() }
      : null;
    const resolve = this.pendingStop;
    this.pendingStop = undefined;
    this.recorder = null;
    this.release();
    this.status.set('stopped');
    resolve?.(recording);
  }

  private fail(message: string): false {
    this.errorMessage.set(message);
    this.status.set('error');
    return false;
  }
}

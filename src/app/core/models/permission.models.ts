export type PermissionKind = 'microphone' | 'geolocation';

/** Estado normalizado de un permiso del navegador, independiente del soporte de `navigator.permissions`. */
export type VitaliaPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable' | 'error';

export type AudioCaptureStatus = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

/** Grabacion en memoria; nunca se persiste. Solo se envia al backend para transcribirla. */
export interface AudioRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  createdAt: string;
}

/** Endpoint de FastAPI + Vosk (ver `VoiceApiService`). */
export const VOICE_TRANSCRIBE_ENDPOINT = '/api/voice/transcribe';

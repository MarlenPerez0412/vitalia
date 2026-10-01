import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AudioRecording, VOICE_TRANSCRIBE_ENDPOINT } from '../models/permission.models';
import { encodeWav16kMono } from './wav-encoder';

/** URL base del backend FastAPI; sobrescribible con un provider cuando exista configuracion por entorno. */
export const VOICE_API_BASE_URL = new InjectionToken<string>('VOICE_API_BASE_URL', { providedIn: 'root', factory: () => 'http://localhost:8000' });

interface TranscriptionResponse { success: boolean; text: string; }

export class VoiceApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

const GENERIC_ERROR = 'No pude procesar tu voz. Puedes seguir escribiendo.';

/**
 * Envia una grabacion de `AudioCaptureService` a `POST /api/voice/transcribe` (FastAPI + Vosk) y devuelve el texto.
 * El audio solo viaja en esta peticion: no se guarda en el navegador ni en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class VoiceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(VOICE_API_BASE_URL);

  async transcribe(recording: AudioRecording): Promise<string> {
    const form = await this.buildForm(recording);
    try {
      const response = await firstValueFrom(this.http.post<TranscriptionResponse>(`${this.baseUrl}${VOICE_TRANSCRIBE_ENDPOINT}`, form));
      return (response?.text ?? '').trim();
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      throw new VoiceApiError(status === 413 ? 'El audio es demasiado largo. Intenta con un mensaje más corto.' : GENERIC_ERROR, status);
    }
  }

  private async buildForm(recording: AudioRecording): Promise<FormData> {
    // Los comandos de voz ya capturan WAV 16 kHz; las grabaciones de MediaRecorder se convierten aqui.
    const wav = recording.mimeType === 'audio/wav' ? recording.blob : await encodeWav16kMono(recording.blob);
    const form = new FormData();
    if (wav) form.append('audio', wav, 'lia.wav');
    else form.append('audio', recording.blob, `lia.${recording.mimeType.includes('mp4') ? 'm4a' : recording.mimeType.includes('ogg') ? 'ogg' : 'webm'}`);
    return form;
  }
}

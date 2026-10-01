import { inject, Injectable, InjectionToken, isDevMode } from '@angular/core';

export interface VoiceDebugEntry {
  /** Idioma activo de la conversación. */
  language: string;
  /** Texto tal como lo entregó Vosk (o lo escribió la persona). */
  heard: string;
  normalized: string;
  candidate: string | null;
  confidence: number | null;
  action: string;
}

/** Registro solo en desarrollo (no en producción ni en las pruebas automatizadas). */
export const LIA_VOICE_DEBUG = new InjectionToken<boolean>('LIA_VOICE_DEBUG', {
  providedIn: 'root',
  factory: () => isDevMode() && !(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.['VITEST'],
});

/**
 * Registro de desarrollo del reconocimiento de LIA: idioma, texto de Vosk, texto normalizado, intención candidata,
 * confianza y acción. Solo en la consola del navegador y solo en desarrollo; nunca se guarda audio ni texto.
 */
@Injectable({ providedIn: 'root' })
export class VoiceDebugLogService {
  private readonly enabled = inject(LIA_VOICE_DEBUG);

  log(entry: VoiceDebugEntry): void {
    if (this.enabled) console.debug('[LIA voz]', entry);
  }

  lifecycle(message: string): void {
    if (this.enabled) console.debug(`[LIA VOICE] ${message}`);
  }
}

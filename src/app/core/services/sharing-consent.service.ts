import { Injectable, signal } from '@angular/core';
import { readStored, removeStored, watchStorage, writeStored } from '../utils/storage-sync';

export type SharingKey = 'emergencies' | 'medications' | 'wellbeing' | 'continuousLocation';
export type SharingPreferences = Readonly<Record<SharingKey, boolean>>;

export const SHARING_LABELS: Readonly<Record<SharingKey, string>> = {
  emergencies: 'Emergencias',
  medications: 'Medicamentos',
  wellbeing: 'Bienestar',
  continuousLocation: 'Ubicación continua',
};

const STORAGE_KEY = 'vitalia.sharing';
const DEFAULTS: SharingPreferences = { emergencies: true, medications: true, wellbeing: true, continuousLocation: false };

function isPreferences(value: unknown): value is SharingPreferences {
  return typeof value === 'object' && value !== null && (Object.keys(DEFAULTS) as SharingKey[]).every((key) => typeof (value as Record<string, unknown>)[key] === 'boolean');
}

/**
 * Lo que Maria autoriza compartir con su red (mock, guardado en localStorage y sincronizado entre pestanas).
 * Es la unica fuente de verdad del consentimiento: las notificaciones a Caregiver y Health la consultan antes de avisar.
 */
@Injectable({ providedIn: 'root' })
export class SharingConsentService {
  readonly preferences = signal<SharingPreferences>(readStored(STORAGE_KEY, isPreferences) ?? DEFAULTS);

  constructor() {
    watchStorage(STORAGE_KEY, () => this.preferences.set(readStored(STORAGE_KEY, isPreferences) ?? DEFAULTS));
  }

  allows(key: SharingKey): boolean { return this.preferences()[key]; }

  /** Invierte el permiso y devuelve su nuevo valor. */
  toggle(key: SharingKey): boolean {
    const next = { ...this.preferences(), [key]: !this.preferences()[key] };
    this.preferences.set(next);
    writeStored(STORAGE_KEY, next);
    return next[key];
  }

  reset(): void {
    removeStored(STORAGE_KEY);
    this.preferences.set(DEFAULTS);
  }
}

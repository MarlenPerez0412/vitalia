import { Injectable, Injector, inject, signal, WritableSignal } from '@angular/core';
import { PermissionKind, VitaliaPermissionState } from '../models/permission.models';
import { LocationService } from './location.service';

const EXPLANATION_KEY = 'vitalia.permission-explained.';

/**
 * Punto unico de acceso a permisos de microfono y ubicacion.
 * `navigator.permissions` se usa solo como pista: su soporte varia (p. ej. `microphone` no existe en Firefox),
 * por lo que el estado real se confirma al solicitar el recurso. Ambas APIs requieren contexto seguro
 * (HTTPS o localhost).
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly injector = inject(Injector);
  private readonly states: Record<PermissionKind, WritableSignal<VitaliaPermissionState>> = {
    microphone: signal('prompt'),
    geolocation: signal('prompt'),
  };
  private readonly watched = new Set<PermissionKind>();

  readonly microphone = this.states.microphone.asReadonly();
  readonly geolocation = this.states.geolocation.asReadonly();

  async checkMicrophonePermission(): Promise<VitaliaPermissionState> {
    if (!this.microphoneSupported()) return this.set('microphone', 'unavailable');
    return this.query('microphone');
  }

  /** Abre el microfono y entrega el stream al llamador, que es responsable de liberarlo. */
  async requestMicrophoneStream(): Promise<MediaStream | null> {
    if (!this.microphoneSupported()) { this.set('microphone', 'unavailable'); return null; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.set('microphone', 'granted');
      return stream;
    } catch (error) {
      this.set('microphone', this.mapMediaError(error));
      return null;
    }
  }

  /** Solicita el permiso sin mantener el microfono abierto. */
  async requestMicrophonePermission(): Promise<VitaliaPermissionState> {
    const stream = await this.requestMicrophoneStream();
    stream?.getTracks().forEach((track) => track.stop());
    return this.states.microphone();
  }

  async checkLocationPermission(): Promise<VitaliaPermissionState> {
    if (!this.geolocationSupported()) return this.set('geolocation', 'unavailable');
    return this.query('geolocation');
  }

  /** La unica forma de pedir ubicacion es solicitar una posicion; se delega en `LocationService`. */
  async requestLocationPermission(): Promise<VitaliaPermissionState> {
    await this.injector.get(LocationService).getCurrentPosition();
    return this.states.geolocation();
  }

  /** Actualizacion desde servicios que usan el recurso directamente (ubicacion, captura de audio). */
  report(kind: PermissionKind, state: VitaliaPermissionState): void { this.set(kind, state); }

  /** Indica si hay que mostrar la explicacion propia antes del dialogo del navegador. */
  async needsExplanation(kind: PermissionKind): Promise<boolean> {
    const state = kind === 'microphone' ? await this.checkMicrophonePermission() : await this.checkLocationPermission();
    return state === 'prompt' && !this.hasSeenExplanation(kind);
  }

  hasSeenExplanation(kind: PermissionKind): boolean {
    try { return localStorage.getItem(EXPLANATION_KEY + kind) === 'true'; } catch { return false; }
  }

  /** Solo guarda que la explicacion fue aceptada; nunca audio, coordenadas ni streams. */
  markExplanationSeen(kind: PermissionKind): void {
    try { localStorage.setItem(EXPLANATION_KEY + kind, 'true'); } catch { /* almacenamiento no disponible */ }
  }

  private async query(kind: PermissionKind): Promise<VitaliaPermissionState> {
    const current = this.states[kind]();
    if (!navigator.permissions?.query) return current;
    try {
      const status = await navigator.permissions.query({ name: kind as PermissionName });
      if (!this.watched.has(kind)) {
        this.watched.add(kind);
        status.addEventListener?.('change', () => this.set(kind, this.mapPermissionState(status.state)));
      }
      return this.set(kind, this.mapPermissionState(status.state));
    } catch {
      // Nombre de permiso no soportado por este navegador: se conserva el estado conocido.
      return current;
    }
  }

  private set(kind: PermissionKind, state: VitaliaPermissionState): VitaliaPermissionState {
    this.states[kind].set(state);
    return state;
  }

  private microphoneSupported(): boolean {
    return globalThis.isSecureContext !== false && typeof navigator.mediaDevices?.getUserMedia === 'function';
  }

  private geolocationSupported(): boolean {
    return globalThis.isSecureContext !== false && 'geolocation' in navigator;
  }

  private mapPermissionState(state: PermissionState): VitaliaPermissionState {
    return state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'prompt';
  }

  private mapMediaError(error: unknown): VitaliaPermissionState {
    const name = error instanceof DOMException || error instanceof Error ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
    if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotSupportedError') return 'unavailable';
    return 'error';
  }
}

import { inject, Injectable, signal } from '@angular/core';
import { DEMO_LOCATION } from './senior-mock-data';
import { LocationStatus, VitaliaLocation } from '../models/location.models';
import { PermissionsService } from './permissions.service';

const FRIENDLY_ERROR = 'No pude obtener tu ubicación.';

/**
 * Unico punto que usa `navigator.geolocation`. La posicion vive solo en memoria:
 * no se persiste y no hay seguimiento continuo salvo que se llame explicitamente a `watchPosition()`.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly permissions = inject(PermissionsService);
  private readonly options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 };
  private watchId: number | null = null;

  readonly status = signal<LocationStatus>('idle');
  readonly position = signal<VitaliaLocation | null>(null);
  readonly errorMessage = signal('');

  getCurrentPosition(): Promise<VitaliaLocation | null> {
    if (!this.supported()) return Promise.resolve(this.applyUnavailable());
    this.status.set('requesting');
    this.errorMessage.set('');
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (result) => resolve(this.applySuccess(result)),
        (error) => resolve(this.applyError(error)),
        this.options,
      );
    });
  }

  watchPosition(): void {
    if (this.watchId !== null) return;
    if (!this.supported()) { this.applyUnavailable(); return; }
    this.status.set('requesting');
    this.errorMessage.set('');
    this.watchId = navigator.geolocation.watchPosition(
      (result) => this.applySuccess(result),
      (error) => this.applyError(error),
      this.options,
    );
  }

  stopWatching(): void {
    if (this.watchId === null) return;
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  /** Ubicacion ficticia centralizada; no modifica el estado del permiso real. */
  getDemoPosition(): VitaliaLocation {
    const location: VitaliaLocation = {
      latitude: DEMO_LOCATION.latitude,
      longitude: DEMO_LOCATION.longitude,
      accuracy: null,
      timestamp: new Date().toISOString(),
      source: 'DEMO',
    };
    this.position.set(location);
    this.errorMessage.set('');
    return location;
  }

  /** Olvida la ultima posicion conocida. */
  clear(): void {
    this.stopWatching();
    this.position.set(null);
    this.status.set('idle');
    this.errorMessage.set('');
  }

  private supported(): boolean {
    return globalThis.isSecureContext !== false && 'geolocation' in navigator;
  }

  private applySuccess(result: GeolocationPosition): VitaliaLocation {
    const location: VitaliaLocation = {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracy: result.coords.accuracy,
      timestamp: new Date(result.timestamp).toISOString(),
      source: 'REAL',
    };
    this.position.set(location);
    this.status.set('granted');
    this.errorMessage.set('');
    this.permissions.report('geolocation', 'granted');
    return location;
  }

  private applyUnavailable(): null {
    this.status.set('unavailable');
    this.errorMessage.set(FRIENDLY_ERROR);
    this.permissions.report('geolocation', 'unavailable');
    return null;
  }

  private applyError(error: GeolocationPositionError): null {
    const status = this.mapErrorToStatus(error.code);
    this.status.set(status);
    this.errorMessage.set(FRIENDLY_ERROR);
    // Un timeout o una posicion no disponible no implican que el permiso se haya denegado.
    if (status === 'denied') this.permissions.report('geolocation', 'denied');
    return null;
  }

  private mapErrorToStatus(code: number): LocationStatus {
    if (code === 1) return 'denied';
    if (code === 2) return 'unavailable';
    return 'error';
  }
}

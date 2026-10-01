import { computed, Injectable, signal } from '@angular/core';
import { EmergencyEventRecord } from '../models/emergency.models';

/**
 * Registro en memoria de eventos de emergencia de la sesion, compartido por Senior (quien los genera)
 * y Care (quien los consulta). No persiste coordenadas ni envia avisos reales.
 */
@Injectable({ providedIn: 'root' })
export class EmergencyRegistryService {
  private readonly store = signal<readonly EmergencyEventRecord[]>([]);
  readonly events = this.store.asReadonly();
  readonly latest = computed(() => this.store()[0] ?? null);

  record(event: Omit<EmergencyEventRecord, 'id' | 'createdAt' | 'status'>): EmergencyEventRecord {
    const record: EmergencyEventRecord = { ...event, id: `emergency-${Date.now()}`, status: 'REGISTERED', createdAt: new Date().toISOString() };
    this.store.update((items) => [record, ...items]);
    return record;
  }
}

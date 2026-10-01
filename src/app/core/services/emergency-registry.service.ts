import { computed, inject, Injectable, signal } from '@angular/core';
import { EmergencyEventRecord } from '../models/emergency.models';
import { readStored, watchStorage, writeStored } from '../utils/storage-sync';
import { NotificationEventsService } from './notification-events.service';
import { MockDatabaseService } from './mock-database.service';

const STORAGE_KEY = 'vitalia.emergencies';
const MAX_STORED = 50;

function isEventList(value: unknown): value is EmergencyEventRecord[] { return Array.isArray(value); }

/**
 * Registro de eventos de emergencia compartido por Senior (quien los genera) y Care (quien los consulta).
 * Se guarda en localStorage (mock) para verse desde otra pestana, pero SIN coordenadas: la ubicacion solo
 * vive en memoria de la pestana de origen. No envia avisos reales.
 */
@Injectable({ providedIn: 'root' })
export class EmergencyRegistryService {
  private readonly notificationEvents = inject(NotificationEventsService);
  private readonly database = inject(MockDatabaseService);
  private readonly store = signal<readonly EmergencyEventRecord[]>(readStored(STORAGE_KEY, isEventList) ?? []);
  readonly events = this.store.asReadonly();
  readonly latest = computed(() => this.store()[0] ?? null);

  constructor() {
    watchStorage(STORAGE_KEY, () => {
      const incoming = readStored(STORAGE_KEY, isEventList) ?? [];
      // Conserva las coordenadas en memoria de los eventos que esta pestana ya conocia.
      const known = new Map(this.store().map((item) => [item.id, item]));
      this.store.set(incoming.map((item) => ({ ...known.get(item.id), ...item })));
    });
  }

  record(event: Omit<EmergencyEventRecord, 'id' | 'createdAt' | 'status'>): EmergencyEventRecord {
    const record: EmergencyEventRecord = { ...event, id: `emergency-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, status: 'ACTIVE', createdAt: new Date().toISOString() };
    this.commit([record, ...this.store()]);
    this.notificationEvents.emergencyRegistered(record);
    return record;
  }

  /** Care marca la emergencia como atendida; Senior y su red reciben el aviso. */
  markAttended(id: string): void {
    const current = this.store().find((item) => item.id === id);
    if (!current || current.status !== 'ACTIVE') return;
    const attended: EmergencyEventRecord = { ...current, status: 'ATTENDED', attendedAt: new Date().toISOString() };
    this.commit(this.store().map((item) => (item.id === id ? attended : item)));
    this.notificationEvents.emergencyAttended(attended);
  }

  markResolved(id: string): void {
    const current = this.store().find((item) => item.id === id);
    if (!current || !['ACTIVE', 'ATTENDED'].includes(current.status)) return;
    const resolved: EmergencyEventRecord = { ...current, status: 'RESOLVED', resolvedAt: new Date().toISOString() };
    this.commit(this.store().map((item) => item.id === id ? resolved : item));
    this.notificationEvents.emergencyResolved(resolved);
  }

  cancel(id: string): void {
    const current = this.store().find((item) => item.id === id);
    if (!current || current.status !== 'ACTIVE') return;
    const cancelled: EmergencyEventRecord = { ...current, status: 'CANCELLED', cancelledAt: new Date().toISOString() };
    this.commit(this.store().map((item) => item.id === id ? cancelled : item));
  }

  private commit(items: readonly EmergencyEventRecord[]): void {
    const trimmed = items.slice(0, MAX_STORED);
    this.store.set(trimmed);
    this.database.updateCollection('emergencies', () => trimmed.map((item) => ({ ...item, latitude: undefined, longitude: undefined, accuracy: undefined })));
    writeStored(STORAGE_KEY, trimmed.map(({ latitude, longitude, accuracy, ...safe }) => safe));
  }
}

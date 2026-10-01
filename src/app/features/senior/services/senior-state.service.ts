import { computed, inject, Injectable, signal } from '@angular/core';
import { EmergencyEventRecord, EmergencySource, EmergencyType } from '../../../core/models/emergency.models';
import { VitaliaLocation } from '../../../core/models/location.models';
import { MedicationRecord } from '../../../core/models/mock-database.models';
import { EmergencyRegistryService } from '../../../core/services/emergency-registry.service';
import { DEMO_SENIOR_ID, MockDatabaseService } from '../../../core/services/mock-database.service';
import { NotificationEventsService } from '../../../core/services/notification-events.service';
import { SENIOR_DEMO_PROFILE } from '../../../core/services/senior-mock-data';
import { EmergencyReason, MedicationDemo, MedicationHistoryEntry, SeniorContact, WellbeingDemo } from '../models/senior.models';

export interface EmergencyRecordDetails { type?: EmergencyType; source?: EmergencySource; contact?: SeniorContact | null; }

@Injectable({ providedIn: 'root' })
export class SeniorStateService {
  private readonly database = inject(MockDatabaseService);
  private readonly emergencyRegistry = inject(EmergencyRegistryService);
  private readonly notificationEvents = inject(NotificationEventsService);

  readonly medicationRecords = computed(() => this.database.snapshot().medications.filter((item) => item.seniorId === DEMO_SENIOR_ID));
  readonly medications = computed<readonly MedicationDemo[]>(() => this.medicationRecords().filter((item) => item.active).flatMap((item) => item.schedule.slice(0, 1).map((time) => {
    const intake = this.todayIntake(item.id, time);
    return {
      id: item.id, name: item.name, dose: [item.dose, item.instructions].filter(Boolean).join(' · '),
      time: this.displayTime(time), period: this.periodFor(time),
      status: intake?.status === 'TAKEN' ? 'TAKEN' : intake?.status === 'SKIPPED' ? 'SKIPPED' : intake?.status === 'PENDING' ? 'PENDING' : 'UPCOMING',
    };
  })));
  readonly medicationHistory = computed<readonly MedicationHistoryEntry[]>(() => this.database.snapshot().medicationIntakes
    .filter((item) => item.seniorId === DEMO_SENIOR_ID && item.status !== 'PENDING')
    .sort((a, b) => (b.takenAt ?? b.scheduledAt).localeCompare(a.takenAt ?? a.scheduledAt))
    .map((item) => {
      const medication = this.database.snapshot().medications.find((entry) => entry.id === item.medicationId);
      return { id: item.id, medication: medication?.name ?? 'Medicamento', dose: medication?.dose ?? '—', scheduledTime: this.dateTimeLabel(item.scheduledAt), recordedAt: item.takenAt ? this.dateTimeLabel(item.takenAt) : 'Sin hora de toma', status: item.status === 'TAKEN' ? 'Tomado' : 'Omitido' };
    }));
  readonly wellbeingCheckins = computed<readonly WellbeingDemo[]>(() => this.database.snapshot().wellbeingCheckins
    .filter((item) => item.seniorId === DEMO_SENIOR_ID).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .map((item) => ({ id: item.id, mood: item.mood, sleep: item.sleep, discomfort: item.discomfort, note: item.notes, createdAt: item.timestamp })));
  readonly emergencyEvents = this.emergencyRegistry.events;
  readonly lastFeedback = signal('');
  readonly nextMedication = computed(() => this.medications().find((item) => item.status === 'PENDING') ?? this.medications().find((item) => item.status === 'UPCOMING') ?? null);

  takeMedication(id: string): void {
    const medication = this.medications().find((item) => item.id === id);
    if (!medication || medication.status === 'TAKEN') return;
    this.recordIntake(id, 'TAKEN');
    this.notificationEvents.medicationTaken(id);
    this.showFeedback(`Registramos ${medication.name} como tomado.`);
  }

  skipMedication(id: string): void {
    const medication = this.medications().find((item) => item.id === id);
    if (!medication || medication.status === 'TAKEN' || medication.status === 'SKIPPED') return;
    this.recordIntake(id, 'SKIPPED');
    this.notificationEvents.medicationSkipped(id, medication.name);
    this.showFeedback(`Registramos ${medication.name} como omitido.`);
  }

  remindMedicationLater(id: string, minutes = 15): void {
    const medication = this.medications().find((item) => item.id === id);
    const record = this.medicationRecords().find((item) => item.id === id);
    if (!medication || !record) return;
    const postponedUntil = new Date(Date.now() + minutes * 60_000).toISOString();
    this.database.updateCollection('medicationIntakes', (items) => {
      const existing = items.find((item) => item.medicationId === id && item.scheduledAt.slice(0, 10) === this.today());
      if (existing) return items.map((item) => item.id === existing.id ? { ...item, postponedUntil, status: 'PENDING' } : item);
      return [...items, { id: `intake-${Date.now()}`, medicationId: id, seniorId: DEMO_SENIOR_ID, scheduledAt: this.scheduledIso(record.schedule[0] ?? '12:00'), postponedUntil, status: 'PENDING' }];
    });
    this.showFeedback(`Te recordaremos ${medication.name} en ${minutes === 60 ? '1 hora' : `${minutes} minutos`}.`);
  }

  saveWellbeing(checkin: Omit<WellbeingDemo, 'id' | 'createdAt'>): void {
    this.database.updateCollection('wellbeingCheckins', (items) => [{ id: `checkin-${Date.now()}`, seniorId: DEMO_SENIOR_ID, mood: checkin.mood, sleep: checkin.sleep, discomfort: checkin.discomfort, notes: checkin.note, timestamp: new Date().toISOString() }, ...items]);
    this.notificationEvents.wellbeingChanged(checkin.mood, checkin.sleep, checkin.discomfort);
    this.showFeedback('Tu check-in quedó guardado. Gracias por contarnos cómo estás.');
  }

  addMedication(input: Omit<MedicationRecord, 'id' | 'seniorId'>): MedicationRecord {
    const created: MedicationRecord = { ...input, id: `med-${Date.now()}`, seniorId: DEMO_SENIOR_ID };
    this.database.updateCollection('medications', (items) => [...items, created]);
    this.showFeedback(`${created.name} quedó agregado al plan.`);
    return created;
  }

  updateMedication(id: string, input: Omit<MedicationRecord, 'id' | 'seniorId'>): void {
    this.database.updateCollection('medications', (items) => items.map((item) => item.id === id ? { ...item, ...input } : item));
    this.showFeedback('Los datos del medicamento quedaron actualizados.');
  }

  deactivateMedication(id: string): void {
    const medication = this.medicationRecords().find((item) => item.id === id);
    if (!medication) return;
    this.database.updateCollection('medications', (items) => items.map((item) => item.id === id ? { ...item, active: false } : item));
    this.showFeedback(`Finalizamos el tratamiento de ${medication.name}. El historial se conserva.`);
  }

  recordEmergency(reason: EmergencyReason, location?: VitaliaLocation, details: EmergencyRecordDetails = {}): EmergencyEventRecord {
    return this.emergencyRegistry.record({ seniorName: SENIOR_DEMO_PROFILE.name, reason, type: details.type ?? 'OTHER', source: details.source ?? 'BUTTON', ...(details.contact ? { contactName: details.contact.name, contactRelationship: details.contact.relationship } : {}), ...(location ? { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy, locationSource: location.source } : {}) });
  }

  clearFeedback(): void { this.lastFeedback.set(''); }

  private recordIntake(medicationId: string, status: 'TAKEN' | 'SKIPPED'): void {
    const medication = this.medicationRecords().find((item) => item.id === medicationId);
    if (!medication) return;
    const timestamp = new Date().toISOString();
    this.database.updateCollection('medicationIntakes', (items) => {
      const existing = items.find((item) => item.medicationId === medicationId && item.scheduledAt.slice(0, 10) === this.today());
      if (existing) return items.map((item) => item.id === existing.id ? { ...item, status, takenAt: timestamp, postponedUntil: undefined } : item);
      return [{ id: `intake-${Date.now()}`, medicationId, seniorId: DEMO_SENIOR_ID, scheduledAt: this.scheduledIso(medication.schedule[0] ?? '12:00'), takenAt: timestamp, status }, ...items];
    });
  }

  private todayIntake(medicationId: string, time: string) { return this.database.snapshot().medicationIntakes.find((item) => item.medicationId === medicationId && item.scheduledAt === this.scheduledIso(time)); }
  private today(): string { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
  private scheduledIso(time: string): string { return `${this.today()}T${time}:00`; }
  private periodFor(time: string): MedicationDemo['period'] { const hour = Number(time.slice(0, 2)); return hour < 12 ? 'MORNING' : hour < 19 ? 'AFTERNOON' : 'NIGHT'; }
  private displayTime(time: string): string { return new Date(`2000-01-01T${time}:00`).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }); }
  private dateTimeLabel(value: string): string { return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }); }
  private showFeedback(message: string): void { this.lastFeedback.set(message); globalThis.setTimeout(() => { if (this.lastFeedback() === message) this.lastFeedback.set(''); }, 4500); }
}

import { computed, inject, Injectable } from '@angular/core';
import { HealthFollowUpRecord } from '../../../core/models/mock-database.models';
import { DEMO_HEALTH_ID, DEMO_SENIOR_ID, MockDatabaseService } from '../../../core/services/mock-database.service';
import { NotificationEventsService } from '../../../core/services/notification-events.service';
import { SharedCalendarService } from '../../../core/services/shared-calendar.service';

export interface FollowUpEntry { id: string; patient: string; task: string; date: string; }
export type FollowUpInput = Omit<HealthFollowUpRecord, 'id' | 'healthUserId' | 'active'>;

@Injectable({ providedIn: 'root' })
export class HealthFollowUpService {
  private readonly database = inject(MockDatabaseService);
  private readonly notifications = inject(NotificationEventsService);
  private readonly calendar = inject(SharedCalendarService);
  readonly records = computed(() => this.database.snapshot().healthFollowups.filter((item) => item.healthUserId === DEMO_HEALTH_ID));
  readonly entries = computed<readonly FollowUpEntry[]>(() => this.records().map((item) => ({ id: item.id, patient: this.patientName(item.seniorId), task: item.note, date: this.dateLabel(item.date) })));

  create(input: FollowUpInput): HealthFollowUpRecord {
    const record: HealthFollowUpRecord = { ...input, id: `followup-${Date.now()}`, healthUserId: DEMO_HEALTH_ID, active: true };
    this.database.updateCollection('healthFollowups', (items) => [record, ...items]);
    this.scheduleReview(record);
    this.notifications.followUpRegistered(record.id, this.patientName(record.seniorId), record.note);
    return record;
  }
  update(id: string, input: FollowUpInput): void { this.database.updateCollection('healthFollowups', (items) => items.map((item) => item.id === id ? { ...item, ...input } : item)); const record = this.records().find((item) => item.id === id); if (record) this.scheduleReview(record); }
  deactivate(id: string): void { this.database.updateCollection('healthFollowups', (items) => items.map((item) => item.id === id ? { ...item, active: false } : item)); }
  register(patient: string, task: string): FollowUpEntry { const record = this.create({ seniorId: DEMO_SENIOR_ID, date: this.today(), type: 'Seguimiento', note: task, recommendation: '', nextReview: undefined }); return { id: record.id, patient, task, date: this.dateLabel(record.date) }; }
  patientName(id: string): string { return this.database.snapshot().users.find((item) => item.id === id)?.name ?? 'Paciente'; }
  private scheduleReview(record: HealthFollowUpRecord): void { if (!record.nextReview) return; const existing = this.calendar.events().find((item) => item.sourceModule === 'HEALTH' && item.sourceEntityId === record.id); const input = { ownerUserId: record.seniorId, title: `Seguimiento: ${record.type}`, category: 'HEALTH' as const, sourceModule: 'HEALTH', sourceEntityId: record.id, institution: 'VITALIA', date: record.nextReview, startTime: '10:00', endTime: '10:30', allDay: false, reminder: '1 día antes', status: 'SCHEDULED' as const }; if (existing) this.calendar.update(existing.id, input, true); else this.calendar.create(input, true); }
  private today(): string { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
  private dateLabel(value: string): string { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`)); }
}

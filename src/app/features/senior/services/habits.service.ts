import { computed, inject, Injectable } from '@angular/core';
import { HabitCompletionRecord, HabitRecord } from '../../../core/models/mock-database.models';
import { DEMO_SENIOR_ID, MockDatabaseService } from '../../../core/services/mock-database.service';

export interface TodayHabit { habit: HabitRecord; completion: HabitCompletionRecord | null; }

@Injectable({ providedIn: 'root' })
export class HabitsService {
  private readonly database = inject(MockDatabaseService);
  readonly habits = computed(() => this.database.snapshot().habits.filter((item) => item.seniorId === DEMO_SENIOR_ID));
  readonly today = computed<readonly TodayHabit[]>(() => {
    const day = new Date().getDay();
    const date = this.todayKey();
    return this.habits().filter((item) => item.active && item.daysOfWeek.includes(day)).map((habit) => ({ habit, completion: this.database.snapshot().habitCompletions.find((item) => item.habitId === habit.id && item.scheduledAt.slice(0, 10) === date) ?? null }));
  });
  readonly pendingToday = computed(() => this.today().filter((item) => !item.completion || item.completion.status === 'POSTPONED'));

  create(input: Omit<HabitRecord, 'id' | 'seniorId'>): HabitRecord {
    const created = { ...input, id: `habit-${Date.now()}`, seniorId: DEMO_SENIOR_ID };
    this.database.updateCollection('habits', (items) => [...items, created]);
    return created;
  }
  update(id: string, input: Omit<HabitRecord, 'id' | 'seniorId'>): void { this.database.updateCollection('habits', (items) => items.map((item) => item.id === id ? { ...item, ...input } : item)); }
  deactivate(id: string): void { this.database.updateCollection('habits', (items) => items.map((item) => item.id === id ? { ...item, active: false } : item)); }
  complete(id: string): void { this.record(id, 'COMPLETED'); }
  skip(id: string, reason?: string): void { this.record(id, 'SKIPPED', { reason }); }
  postpone(id: string, minutes: 15 | 60 | 180): void { this.record(id, 'POSTPONED', { postponedUntil: new Date(Date.now() + minutes * 60_000).toISOString() }); }

  private record(id: string, status: HabitCompletionRecord['status'], extra: Partial<HabitCompletionRecord> = {}): void {
    const habit = this.habits().find((item) => item.id === id); if (!habit) return;
    const scheduledAt = `${this.todayKey()}T${habit.startTime}:00`;
    this.database.updateCollection('habitCompletions', (items) => {
      const existing = items.find((item) => item.habitId === id && item.scheduledAt === scheduledAt);
      const record: HabitCompletionRecord = { id: existing?.id ?? `habit-log-${Date.now()}`, habitId: id, seniorId: DEMO_SENIOR_ID, scheduledAt, recordedAt: new Date().toISOString(), status, ...extra };
      return existing ? items.map((item) => item.id === existing.id ? record : item) : [record, ...items];
    });
  }
  private todayKey(): string { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
}

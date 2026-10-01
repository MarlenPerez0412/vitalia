import { computed, inject, Injectable } from '@angular/core';
import { CalendarEventRecord } from '../models/mock-database.models';
import { MockDatabaseService } from './mock-database.service';

export interface CalendarConflictResult { event: CalendarEventRecord; conflicts: readonly CalendarEventRecord[]; suggestions: readonly { startTime: string; endTime: string }[]; }

@Injectable({ providedIn: 'root' })
export class SharedCalendarService {
  private readonly database = inject(MockDatabaseService);
  readonly events = computed(() => this.database.snapshot().calendarEvents);
  forOwner(ownerUserId: string) { return this.events().filter((item) => item.ownerUserId === ownerUserId).sort((a, b) => `${a.date}${a.startTime ?? ''}`.localeCompare(`${b.date}${b.startTime ?? ''}`)); }

  create(input: Omit<CalendarEventRecord, 'id'>, allowConflict = false): CalendarConflictResult {
    const event = { ...input, id: `calendar-${Date.now()}` };
    const conflicts = this.findConflicts(event);
    const suggestions = conflicts.length ? this.suggestTimes(event, 3) : [];
    if (!conflicts.length || allowConflict) this.database.updateCollection('calendarEvents', (items) => [...items, event]);
    return { event, conflicts, suggestions };
  }
  update(id: string, input: Omit<CalendarEventRecord, 'id'>, allowConflict = false): CalendarConflictResult {
    const event = { ...input, id };
    const conflicts = this.findConflicts(event, id);
    const suggestions = conflicts.length ? this.suggestTimes(event, 3, id) : [];
    if (!conflicts.length || allowConflict) this.database.updateCollection('calendarEvents', (items) => items.map((item) => item.id === id ? event : item));
    return { event, conflicts, suggestions };
  }
  cancel(id: string): void { this.database.updateCollection('calendarEvents', (items) => items.map((item) => item.id === id ? { ...item, status: 'CANCELLED' } : item)); }
  delete(id: string): void { this.database.updateCollection('calendarEvents', (items) => items.filter((item) => item.id !== id)); }
  findConflicts(candidate: Omit<CalendarEventRecord, 'id'> | CalendarEventRecord, ignoreId?: string): CalendarEventRecord[] {
    if (candidate.allDay || !candidate.startTime || !candidate.endTime || candidate.status === 'CANCELLED') return [];
    return this.events().filter((item) => item.id !== ignoreId && item.ownerUserId === candidate.ownerUserId && item.date === candidate.date && item.status !== 'CANCELLED' && !item.allDay && !!item.startTime && !!item.endTime && candidate.startTime! < item.endTime! && candidate.endTime! > item.startTime!);
  }
  suggestTimes(candidate: Omit<CalendarEventRecord, 'id'> | CalendarEventRecord, limit = 3, ignoreId?: string): { startTime: string; endTime: string }[] {
    if (!candidate.startTime || !candidate.endTime) return [];
    const duration = this.minutes(candidate.endTime) - this.minutes(candidate.startTime);
    const suggestions: { startTime: string; endTime: string }[] = [];
    for (let start = 8 * 60; start + duration <= 20 * 60 && suggestions.length < limit; start += 30) {
      const proposed = { ...candidate, startTime: this.time(start), endTime: this.time(start + duration) };
      if (!this.findConflicts(proposed, ignoreId).length) suggestions.push({ startTime: proposed.startTime, endTime: proposed.endTime });
    }
    return suggestions;
  }
  private minutes(time: string): number { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; }
  private time(minutes: number): string { return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
}

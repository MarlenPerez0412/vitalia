import { computed, inject, Injectable } from '@angular/core';
import { CustomVoiceAction, CustomVoiceCommandRecord } from '../../../core/models/mock-database.models';
import { DEMO_SENIOR_ID, MockDatabaseService } from '../../../core/services/mock-database.service';
import { normalizeText } from '../../../core/utils/text-normalize';

export const SAFE_CUSTOM_VOICE_ACTIONS: readonly CustomVoiceAction[] = ['CALL_CONTACT', 'OPEN_LOCATION', 'OPEN_MEDICATIONS', 'OPEN_CALENDAR', 'OPEN_EMERGENCY'];

@Injectable({ providedIn: 'root' })
export class CustomVoiceCommandService {
  private readonly database = inject(MockDatabaseService);
  readonly commands = computed(() => this.database.snapshot().voiceCommands.filter((item) => item.userId === DEMO_SENIOR_ID));
  create(input: Omit<CustomVoiceCommandRecord, 'id' | 'userId'>): CustomVoiceCommandRecord {
    if (!SAFE_CUSTOM_VOICE_ACTIONS.includes(input.action)) throw new Error('Acción no permitida.');
    const created = { ...input, id: `voice-command-${Date.now()}`, userId: DEMO_SENIOR_ID, phrase: input.phrase.trim() };
    this.database.updateCollection('voiceCommands', (items) => [...items, created]); return created;
  }
  update(id: string, input: Omit<CustomVoiceCommandRecord, 'id' | 'userId'>): void { if (!SAFE_CUSTOM_VOICE_ACTIONS.includes(input.action)) return; this.database.updateCollection('voiceCommands', (items) => items.map((item) => item.id === id ? { ...item, ...input, phrase: input.phrase.trim() } : item)); }
  remove(id: string): void { this.database.updateCollection('voiceCommands', (items) => items.filter((item) => item.id !== id)); }
  resolve(phrase: string): CustomVoiceCommandRecord | null { const normalized = normalizeText(phrase).replace(/^lia[ ,]*/, ''); return this.commands().find((item) => item.enabled && normalizeText(item.phrase).replace(/^lia[ ,]*/, '') === normalized) ?? null; }
}

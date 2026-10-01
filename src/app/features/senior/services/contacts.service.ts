import { computed, inject, Injectable } from '@angular/core';
import { EmergencyContactRecord } from '../../../core/models/mock-database.models';
import { DEMO_SENIOR_ID, MockDatabaseService } from '../../../core/services/mock-database.service';
import { normalizeText } from '../../../core/utils/text-normalize';
import { ContactRelationship, SeniorContact } from '../models/senior.models';

const RELATIONSHIP_WORDS: Readonly<Record<string, ContactRelationship>> = { hija: 'DAUGHTER', hijo: 'SON', esposo: 'SPOUSE', esposa: 'SPOUSE', marido: 'SPOUSE', hermana: 'SIBLING', hermano: 'SIBLING', cuidadora: 'CAREGIVER', cuidador: 'CAREGIVER' };

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private readonly database = inject(MockDatabaseService);
  readonly contacts = computed<readonly SeniorContact[]>(() => this.database.snapshot().emergencyContacts.filter((item) => item.seniorId === DEMO_SENIOR_ID && item.active).map((item) => ({ id: item.id, name: item.name, relationship: item.relationship, relationshipKey: item.relationshipKey, phone: item.phone, availability: item.availability, primaryEmergency: item.primaryContact })));
  readonly primaryEmergencyContact = computed<SeniorContact | null>(() => this.contacts().find((contact) => contact.primaryEmergency) ?? this.contacts()[0] ?? null);

  findByRelationship(word: string): SeniorContact | null {
    const normalized = normalizeText(word).replace(/^mi /, '');
    const key = RELATIONSHIP_WORDS[normalized];
    return this.contacts().find((contact) => contact.relationshipKey === key || normalizeText(contact.relationship) === normalized) ?? null;
  }

  add(input: Omit<EmergencyContactRecord, 'id' | 'seniorId' | 'active'>): EmergencyContactRecord {
    const created: EmergencyContactRecord = { ...input, id: `contact-${Date.now()}`, seniorId: DEMO_SENIOR_ID, active: true };
    this.database.updateCollection('emergencyContacts', (items) => this.normalizePrimary([...items, created], created.primaryContact ? created.id : undefined));
    return created;
  }
  update(id: string, input: Omit<EmergencyContactRecord, 'id' | 'seniorId' | 'active'>): void { this.database.updateCollection('emergencyContacts', (items) => this.normalizePrimary(items.map((item) => item.id === id ? { ...item, ...input } : item), input.primaryContact ? id : undefined)); }
  deactivate(id: string): void { this.database.updateCollection('emergencyContacts', (items) => items.map((item) => item.id === id ? { ...item, active: false, primaryContact: false } : item)); }
  record(id: string): EmergencyContactRecord | null { return this.database.snapshot().emergencyContacts.find((item) => item.id === id) ?? null; }
  private normalizePrimary(items: EmergencyContactRecord[], primaryId?: string): EmergencyContactRecord[] { if (!primaryId) return items; return items.map((item) => item.seniorId === DEMO_SENIOR_ID ? { ...item, primaryContact: item.id === primaryId, emergencyContact: item.id === primaryId ? true : item.emergencyContact } : item); }
}

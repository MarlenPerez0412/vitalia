import { computed, Injectable, signal } from '@angular/core';
import { CONTACTS_DEMO } from '../../../core/services/senior-mock-data';
import { normalizeText } from '../../../core/utils/text-normalize';
import { ContactRelationship, SeniorContact } from '../models/senior.models';

/** Palabras con las que la persona nombra a un contacto ("mi hija", "mi esposo"...). */
const RELATIONSHIP_WORDS: Readonly<Record<string, ContactRelationship>> = {
  hija: 'DAUGHTER', hijo: 'SON', esposo: 'SPOUSE', esposa: 'SPOUSE', marido: 'SPOUSE',
  hermana: 'SIBLING', hermano: 'SIBLING', cuidadora: 'CAREGIVER', cuidador: 'CAREGIVER',
};

/** Red de apoyo autorizada por la persona mayor. Fuente unica para Familia, Emergencia y comandos de voz. */
@Injectable({ providedIn: 'root' })
export class ContactsService {
  readonly contacts = signal<readonly SeniorContact[]>(CONTACTS_DEMO);
  readonly primaryEmergencyContact = computed<SeniorContact | null>(() =>
    this.contacts().find((contact) => contact.primaryEmergency) ?? this.contacts()[0] ?? null);

  /** Busca por parentesco escrito o hablado ("hija", "Hija", "mi hija"). */
  findByRelationship(word: string): SeniorContact | null {
    const normalized = normalizeText(word).replace(/^mi /, '');
    const key = RELATIONSHIP_WORDS[normalized];
    return this.contacts().find((contact) => contact.relationshipKey === key || normalizeText(contact.relationship) === normalized) ?? null;
  }
}

import { computed, inject, Injectable, signal } from '@angular/core';
import { EmergencyEventRecord, EmergencySource, EmergencyType } from '../../../core/models/emergency.models';
import { VitaliaLocation } from '../../../core/models/location.models';
import { EmergencyRegistryService } from '../../../core/services/emergency-registry.service';
import { MEDICATION_HISTORY_DEMO, MEDICATIONS_DEMO, SENIOR_DEMO_PROFILE } from '../../../core/services/senior-mock-data';
import { EmergencyReason, MedicationDemo, MedicationHistoryEntry, SeniorContact, WellbeingDemo } from '../models/senior.models';

export interface EmergencyRecordDetails {
  type?: EmergencyType;
  source?: EmergencySource;
  contact?: SeniorContact | null;
}

@Injectable({ providedIn: 'root' })
export class SeniorStateService {
  readonly medications = signal<readonly MedicationDemo[]>(MEDICATIONS_DEMO.map((item) => ({ ...item })));
  readonly medicationHistory = signal<readonly MedicationHistoryEntry[]>(MEDICATION_HISTORY_DEMO.map((item) => ({ ...item })));
  readonly wellbeingCheckins = signal<readonly WellbeingDemo[]>([]);
  private readonly emergencyRegistry = inject(EmergencyRegistryService);
  /** Eventos de la sesion; viven en el registro de core para que Care tambien los vea. */
  readonly emergencyEvents = this.emergencyRegistry.events;
  readonly lastFeedback = signal('');

  readonly nextMedication = computed(() =>
    this.medications().find((medication) => medication.status === 'PENDING')
      ?? this.medications().find((medication) => medication.status === 'UPCOMING')
      ?? null,
  );

  takeMedication(id: string): void {
    const medication = this.medications().find((item) => item.id === id);
    if (!medication || medication.status === 'TAKEN') return;
    this.medications.update((items) => items.map((item) => item.id === id ? { ...item, status: 'TAKEN' } : item));
    const history: MedicationHistoryEntry = {
      id: `history-${Date.now()}`,
      medication: medication.name,
      dose: medication.dose.split('·')[0].trim(),
      scheduledTime: `Hoy · ${medication.time}`,
      recordedAt: 'Ahora',
      status: 'Tomado',
    };
    this.medicationHistory.update((items) => [history, ...items]);
    this.showFeedback(`Registramos ${medication.name} como tomado.`);
  }

  remindMedicationLater(id: string): void {
    const medication = this.medications().find((item) => item.id === id);
    if (medication) this.showFeedback(`Te recordaremos ${medication.name} en 15 minutos.`);
  }

  saveWellbeing(checkin: Omit<WellbeingDemo, 'id' | 'createdAt'>): void {
    this.wellbeingCheckins.update((items) => [{ ...checkin, id: `checkin-${Date.now()}`, createdAt: new Date().toISOString() }, ...items]);
    this.showFeedback('Tu check-in quedó guardado. Gracias por contarnos cómo estás.');
  }

  recordEmergency(reason: EmergencyReason, location?: VitaliaLocation, details: EmergencyRecordDetails = {}): EmergencyEventRecord {
    return this.emergencyRegistry.record({
      seniorName: SENIOR_DEMO_PROFILE.name,
      reason,
      type: details.type ?? 'OTHER',
      source: details.source ?? 'BUTTON',
      ...(details.contact ? { contactName: details.contact.name, contactRelationship: details.contact.relationship } : {}),
      ...(location ? { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy, locationSource: location.source } : {}),
    });
  }

  clearFeedback(): void { this.lastFeedback.set(''); }

  private showFeedback(message: string): void {
    this.lastFeedback.set(message);
    globalThis.setTimeout(() => {
      if (this.lastFeedback() === message) this.lastFeedback.set('');
    }, 4500);
  }
}

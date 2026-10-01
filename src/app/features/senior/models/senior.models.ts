import { EmergencyEventRecord } from '../../../core/models/emergency.models';
import { VitaliaIconName } from '../../../shared/ui/icon/vitalia-icon.component';
import { ModuleTileColor } from '../../../shared/ui/cards/module-tile.component';
import { StatusBadgeVariant } from '../../../shared/ui/status-badge/status-badge.component';

export type MedicationDemoStatus = 'TAKEN' | 'PENDING' | 'UPCOMING';
export type MedicationPeriod = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export interface MedicationDemo {
  id: string;
  name: string;
  dose: string;
  time: string;
  period: MedicationPeriod;
  status: MedicationDemoStatus;
}

export interface MedicationHistoryEntry {
  id: string;
  medication: string;
  dose: string;
  scheduledTime: string;
  recordedAt: string;
  status: 'Tomado' | 'Omitido';
}

export interface CatalogItem {
  title: string;
  description: string;
  icon: VitaliaIconName;
  route?: string;
}

export interface CatalogDefinition {
  eyebrow: string;
  title: string;
  description: string;
  /** Color suave del modulo en la identidad VITALIA. */
  color: ModuleTileColor;
  items: readonly CatalogItem[];
}

export interface SignatureMetric {
  label: string;
  value: number;
  detail: string;
  tone: StatusBadgeVariant;
}

export interface PreventFactor {
  label: string;
  value: string;
  detail: string;
  severity: 'attention' | 'urgent';
}

export type LiaState = 'idle' | 'listening' | 'processing' | 'speaking' | 'completed' | 'error';
export type LiaIntent =
  | 'NEXT_MEDICATION' | 'MEDICATION_TAKEN' | 'START_CHECKIN' | 'CALL_FAMILY' | 'START_EMERGENCY' | 'OPEN_LOCATION'
  | 'PENSION_INFO' | 'MEMORY_ACTIVITY' | 'UNKNOWN';
export interface LiaAction { label: string; route: string; /** Inicia el flujo de emergencia (fuente LIA) antes de navegar. */ emergency?: boolean; }
/** Pantalla existente que LIA abre por si misma despues de responder. */
export interface LiaNavigation { route: string; queryParams?: Record<string, string | number>; }
export interface LiaReply {
  intent: LiaIntent;
  text: string;
  action?: LiaAction;
  /** Version para la voz de LIA cuando difiere del texto visible. */
  speech?: string;
  opens?: LiaNavigation;
}
export interface LiaMessage { id: string; sender: 'user' | 'lia'; text: string; confirmation?: boolean; viaVoice?: boolean; action?: LiaAction; }
export type AccessibilityMode = 'standard' | 'accessible' | 'assisted' | 'simplified';
export type EmergencyReason = 'Me siento mal' | 'Me caí' | 'Estoy mareada' | 'Otra emergencia' | 'Necesito ayuda';
export type EmergencyStep = 'idle' | 'selected' | 'countdown' | 'confirmed' | 'locating' | 'location-fallback' | 'contacted' | 'shared' | 'registered' | 'cancelled';

export interface WellbeingDemo {
  id: string;
  mood: number;
  sleep: number;
  discomfort: string;
  note: string;
  createdAt: string;
}

/** Alias historico: los eventos viven en `EmergencyRegistryService` (core) para que Care pueda consultarlos. */
export type EmergencyEventDemo = EmergencyEventRecord;

export type ContactRelationship = 'DAUGHTER' | 'SON' | 'SPOUSE' | 'SIBLING' | 'CAREGIVER' | 'OTHER';

export interface SeniorContact {
  id: string;
  name: string;
  /** Etiqueta visible, p. ej. "Hija". */
  relationship: string;
  relationshipKey: ContactRelationship;
  /** Formato internacional; `PhoneService` genera el enlace `tel:`. */
  phone: string;
  availability: string;
  primaryEmergency: boolean;
}

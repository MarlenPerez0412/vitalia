import { VitaliaLocation } from './location.models';

export type EmergencyType = 'HELP' | 'SICK' | 'FALL' | 'DIZZY' | 'OTHER';

/** Origen de la solicitud: todas terminan en el mismo `EmergencyService`. */
export type EmergencySource = 'BUTTON' | 'LIA' | 'GLOBAL_VOICE';

/** Evento de emergencia simulado (sin envio real). Se guarda en localStorage sin coordenadas, para que Care lo vea desde otra pestana. */
export interface EmergencyEventRecord {
  id: string;
  seniorName: string;
  reason: string;
  type: EmergencyType;
  source: EmergencySource;
  status: 'ACTIVE' | 'ATTENDED' | 'RESOLVED' | 'CANCELLED';
  createdAt: string;
  attendedAt?: string;
  resolvedAt?: string;
  cancelledAt?: string;
  contactName?: string;
  contactRelationship?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  locationSource?: VitaliaLocation['source'];
}

export const EMERGENCY_TYPE_LABELS: Readonly<Record<EmergencyType, string>> = {
  HELP: 'Solicitud de ayuda',
  SICK: 'Malestar',
  FALL: 'Caída',
  DIZZY: 'Mareo',
  OTHER: 'Otra emergencia',
};

export const EMERGENCY_SOURCE_LABELS: Readonly<Record<EmergencySource, string>> = {
  BUTTON: 'Botón de emergencia',
  LIA: 'Conversación con LIA',
  GLOBAL_VOICE: 'Comando de voz',
};

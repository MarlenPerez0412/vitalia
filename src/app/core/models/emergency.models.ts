import { VitaliaLocation } from './location.models';

export type EmergencyType = 'HELP' | 'SICK' | 'FALL' | 'DIZZY' | 'OTHER';

/** Origen de la solicitud: todas terminan en el mismo `EmergencyService`. */
export type EmergencySource = 'BUTTON' | 'LIA' | 'GLOBAL_VOICE';

/** Evento de emergencia simulado. Vive solo en memoria durante la sesion (sin persistencia ni envio real). */
export interface EmergencyEventRecord {
  id: string;
  seniorName: string;
  reason: string;
  type: EmergencyType;
  source: EmergencySource;
  status: 'REGISTERED';
  createdAt: string;
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

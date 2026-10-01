import { PermissionCode, RoleDefinition } from './access.models';
import { AuditLog } from './domain.models';
import { EmergencyEventRecord } from './emergency.models';
import { Notification } from './notification.models';

export interface MockUserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
}

export interface SeniorCaregiverLink { id: string; seniorId: string; caregiverId: string; relationship: string; active: boolean; }
export interface SeniorHealthLink { id: string; seniorId: string; healthUserId: string; active: boolean; }

export type MedicationIntakeStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';
export interface MedicationRecord {
  id: string;
  seniorId: string;
  photoUri?: string;
  name: string;
  dose: string;
  administrationRoute: string;
  schedule: readonly string[];
  instructions: string;
  remainingQuantity: number;
  refillInterval: number;
  reason: string;
  active: boolean;
}
export interface MedicationIntakeRecord {
  id: string;
  medicationId: string;
  seniorId: string;
  scheduledAt: string;
  takenAt?: string;
  postponedUntil?: string;
  status: MedicationIntakeStatus;
}

export interface WellbeingCheckinRecord {
  id: string;
  seniorId: string;
  mood: number;
  sleep: number;
  notes: string;
  discomfort: string;
  timestamp: string;
}

export type HabitCategory = 'HEALTH' | 'WELLBEING' | 'COGNITION' | 'PHYSICAL' | 'PERSONAL' | 'OTHER';
export interface HabitRecord {
  id: string;
  seniorId: string;
  name: string;
  category: HabitCategory;
  daysOfWeek: readonly number[];
  startTime: string;
  endTime?: string;
  active: boolean;
}
export type HabitCompletionStatus = 'COMPLETED' | 'SKIPPED' | 'POSTPONED';
export interface HabitCompletionRecord {
  id: string;
  habitId: string;
  seniorId: string;
  scheduledAt: string;
  recordedAt: string;
  status: HabitCompletionStatus;
  postponedUntil?: string;
  reason?: string;
}

export type CalendarEventCategory = 'PENSION' | 'HEALTH' | 'HABIT' | 'WELLBEING' | 'FAMILY' | 'OTHER' | 'IMSS' | 'ISSSTE' | 'SAT' | 'DEPOSIT' | 'SERVICES' | 'TRAMITE' | 'PERSONAL';
export interface CalendarEventRecord {
  id: string;
  ownerUserId: string;
  title: string;
  category: CalendarEventCategory;
  sourceModule: string;
  sourceEntityId?: string;
  institution?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  reminder?: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
}

export type ContactRelationship = 'DAUGHTER' | 'SON' | 'SPOUSE' | 'SIBLING' | 'CAREGIVER' | 'OTHER';
export interface EmergencyContactRecord {
  id: string;
  seniorId: string;
  name: string;
  relationship: string;
  relationshipKey: ContactRelationship;
  phone: string;
  photoUri?: string;
  availability: string;
  emergencyContact: boolean;
  primaryContact: boolean;
  active: boolean;
}

export interface ConsentRecord { id: string; seniorId: string; kind: string; granted: boolean; updatedAt: string; }
export interface AlertRecord { id: string; seniorId: string; type: string; message: string; status: 'OPEN' | 'RESOLVED'; createdAt: string; }
export interface HealthFollowUpRecord {
  id: string;
  seniorId: string;
  healthUserId: string;
  date: string;
  type: string;
  note: string;
  recommendation: string;
  nextReview?: string;
  active: boolean;
}
export interface CognitiveSessionRecord { id: string; seniorId: string; activity: string; score?: number; completedAt: string; durationMinutes: number; }
export type CustomVoiceAction = 'CALL_CONTACT' | 'OPEN_LOCATION' | 'OPEN_MEDICATIONS' | 'OPEN_CALENDAR' | 'OPEN_EMERGENCY';
export interface CustomVoiceCommandRecord { id: string; userId: string; phrase: string; action: CustomVoiceAction; targetId?: string; enabled: boolean; }

export interface MockDatabaseState {
  schemaVersion: 1;
  users: MockUserRecord[];
  roles: RoleDefinition[];
  permissions: Record<string, PermissionCode[]>;
  seniorCaregiverLinks: SeniorCaregiverLink[];
  seniorHealthLinks: SeniorHealthLink[];
  medications: MedicationRecord[];
  medicationIntakes: MedicationIntakeRecord[];
  wellbeingCheckins: WellbeingCheckinRecord[];
  habits: HabitRecord[];
  habitCompletions: HabitCompletionRecord[];
  calendarEvents: CalendarEventRecord[];
  emergencyContacts: EmergencyContactRecord[];
  consents: ConsentRecord[];
  emergencies: EmergencyEventRecord[];
  alerts: AlertRecord[];
  notifications: Notification[];
  healthFollowups: HealthFollowUpRecord[];
  cognitiveSessions: CognitiveSessionRecord[];
  voiceCommands: CustomVoiceCommandRecord[];
  auditLogs: AuditLog[];
}

export type MockCollectionName = Exclude<keyof MockDatabaseState, 'schemaVersion'>;

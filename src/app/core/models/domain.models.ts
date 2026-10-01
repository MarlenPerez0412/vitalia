export type Role = 'SENIOR' | 'CAREGIVER' | 'HEALTH' | 'ADMIN' | 'INSTITUTION';

export interface Permission {
  id: string;
  code: string;
  description: string;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  permissions: Permission[];
  active: boolean;
}

export interface SeniorProfile {
  id: string;
  userId: string;
  birthDate?: string;
  preferredName: string;
  caregiverIds: string[];
  consentLocationSharing: boolean;
}

export interface CaregiverProfile {
  id: string;
  userId: string;
  seniorIds: string[];
  relationship?: string;
}

export interface HealthProfessionalProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  specialty?: string;
  authorizedSeniorIds: string[];
}

export interface Medication {
  id: string;
  seniorId: string;
  name: string;
  dosage: string;
  instructions?: string;
  active: boolean;
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  times: string[];
  startsAt: string;
  endsAt?: string;
}

export type IntakeStatus = 'TAKEN' | 'SKIPPED' | 'MISSED';

export interface MedicationIntake {
  id: string;
  scheduleId: string;
  scheduledAt: string;
  recordedAt?: string;
  status: IntakeStatus;
}

export interface WellbeingCheckin {
  id: string;
  seniorId: string;
  mood: number;
  energy: number;
  pain: number;
  note?: string;
  createdAt: string;
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: string;
  seniorId: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
}

export interface EmergencyEvent {
  id: string;
  seniorId: string;
  alertId?: string;
  status: 'ACTIVE' | 'CANCELLED' | 'CLOSED';
  initiatedAt: string;
  closedAt?: string;
}

export interface LocationRecord {
  id: string;
  seniorId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  consentId: string;
  recordedAt: string;
}

export interface CognitiveActivity {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  durationMinutes: number;
  completedAt?: string;
  score?: number;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

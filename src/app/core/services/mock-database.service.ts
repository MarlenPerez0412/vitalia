import { Injectable, signal } from '@angular/core';
import { DEFAULT_ROLE_PERMISSIONS, ROLE_DEFINITIONS } from '../models/access.models';
import {
  CalendarEventRecord, MockCollectionName, MockDatabaseState, MockUserRecord,
} from '../models/mock-database.models';
import { readStored, watchStorage, writeStored } from '../utils/storage-sync';

export const MOCK_DATABASE_KEY = 'vitalia.mock-database.v1';
export const DEMO_SENIOR_ID = 'usr-senior-demo';
export const DEMO_CAREGIVER_ID = 'usr-care-demo';
export const DEMO_HEALTH_ID = 'usr-health-demo';
export const DEMO_ADMIN_ID = 'usr-admin-demo';

function localDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function scheduledAt(time: string): string { return `${localDate()}T${time}:00`; }

const USERS: MockUserRecord[] = [
  { id: DEMO_SENIOR_ID, name: 'María Hernández', email: 'maria@demo.vitalia.mx', phone: '+52 55 0000 0010', role: 'SENIOR', active: true },
  { id: DEMO_CAREGIVER_ID, name: 'Ana Hernández', email: 'ana@demo.vitalia.mx', phone: '+52 55 0000 0000', role: 'CAREGIVER', active: true },
  { id: DEMO_HEALTH_ID, name: 'Dr. Ruiz', email: 'salud@demo.vitalia.mx', phone: '+52 55 0000 0020', role: 'HEALTH', active: true },
  { id: DEMO_ADMIN_ID, name: 'Administración VITALIA', email: 'admin@demo.vitalia.mx', phone: '+52 55 0000 0030', role: 'ADMIN', active: true },
  { id: 'usr-luis-demo', name: 'Luis Hernández', email: 'luis@demo.vitalia.mx', phone: '+52 55 0000 0001', role: 'CAREGIVER', active: false },
  { id: 'usr-paula-demo', name: 'Dra. Paula Méndez', email: 'paula@demo.vitalia.mx', phone: '+52 55 0000 0021', role: 'HEALTH', active: true },
];

export function createMockDatabaseSeed(): MockDatabaseState {
  const calendar: CalendarEventRecord[] = [
    // IMSS
    { id: 'cal-imss-cita-1', ownerUserId: DEMO_SENIOR_ID, title: 'Cita médica IMSS', category: 'IMSS', sourceModule: 'PENSIONS', institution: 'IMSS', date: localDate(3), startTime: '10:00', endTime: '11:00', allDay: false, reminder: '1 día antes', status: 'SCHEDULED' },
    { id: 'cal-imss-estudio', ownerUserId: DEMO_SENIOR_ID, title: 'Entrega de estudios IMSS', category: 'IMSS', sourceModule: 'PENSIONS', institution: 'IMSS', date: localDate(10), startTime: '09:00', endTime: '09:30', allDay: false, reminder: '1 día antes', status: 'SCHEDULED' },
    // ISSSTE
    { id: 'cal-issste-tramite', ownerUserId: DEMO_SENIOR_ID, title: 'Trámite de credencial ISSSTE', category: 'ISSSTE', sourceModule: 'PENSIONS', institution: 'ISSSTE', date: localDate(6), startTime: '11:00', endTime: '12:00', allDay: false, reminder: '1 día antes', status: 'SCHEDULED' },
    { id: 'cal-issste-pension', ownerUserId: DEMO_SENIOR_ID, title: 'Revisión de pensión ISSSTE', category: 'ISSSTE', sourceModule: 'PENSIONS', institution: 'ISSSTE', date: localDate(14), allDay: true, reminder: 'Ese día', status: 'SCHEDULED' },
    // SAT
    { id: 'cal-sat-declaracion', ownerUserId: DEMO_SENIOR_ID, title: 'Declaración anual SAT', category: 'SAT', sourceModule: 'PENSIONS', institution: 'SAT', date: localDate(20), allDay: true, reminder: '3 días antes', status: 'SCHEDULED' },
    { id: 'cal-sat-cita', ownerUserId: DEMO_SENIOR_ID, title: 'Cita en el SAT', category: 'SAT', sourceModule: 'PENSIONS', institution: 'SAT', date: localDate(25), startTime: '13:00', endTime: '14:00', allDay: false, reminder: '1 día antes', status: 'SCHEDULED' },
    // Pensión Bienestar
    { id: 'cal-pension-deposito', ownerUserId: DEMO_SENIOR_ID, title: 'Depósito Pensión Bienestar', category: 'PENSION', sourceModule: 'PENSIONS', institution: 'Pensión Bienestar', date: localDate(7), allDay: true, reminder: 'Ese día', status: 'SCHEDULED' },
    { id: 'cal-pension-periodo', ownerUserId: DEMO_SENIOR_ID, title: 'Inicio periodo nov–dic Pensión Bienestar', category: 'PENSION', sourceModule: 'PENSIONS', institution: 'Pensión Bienestar', date: localDate(45), allDay: true, reminder: '3 días antes', status: 'SCHEDULED' },
    // Depósitos / Historial
    { id: 'cal-deposit-1', ownerUserId: DEMO_SENIOR_ID, title: 'Depósito bimestral registrado', category: 'DEPOSIT', sourceModule: 'PENSIONS', institution: 'Banco', date: localDate(-14), allDay: true, status: 'COMPLETED' },
    { id: 'cal-deposit-2', ownerUserId: DEMO_SENIOR_ID, title: 'Depósito bimestral registrado', category: 'DEPOSIT', sourceModule: 'PENSIONS', institution: 'Banco', date: localDate(-75), allDay: true, status: 'COMPLETED' },
  ];
  return {
    schemaVersion: 1,
    users: USERS.map((item) => ({ ...item })),
    roles: ROLE_DEFINITIONS.map((item) => ({ ...item })),
    permissions: Object.fromEntries(Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, codes]) => [role, [...codes]])),
    seniorCaregiverLinks: [{ id: 'link-maria-ana', seniorId: DEMO_SENIOR_ID, caregiverId: DEMO_CAREGIVER_ID, relationship: 'Hija', active: true }],
    seniorHealthLinks: [{ id: 'link-maria-ruiz', seniorId: DEMO_SENIOR_ID, healthUserId: DEMO_HEALTH_ID, active: true }],
    medications: [
      { id: 'med-losartan', seniorId: DEMO_SENIOR_ID, name: 'Losartán', dose: '50 mg', administrationRoute: 'Oral', schedule: ['08:00'], instructions: 'Tomar con agua', remainingQuantity: 24, refillInterval: 30, reason: 'Plan indicado por su profesional', active: true },
      { id: 'med-metformin', seniorId: DEMO_SENIOR_ID, name: 'Metformina', dose: '500 mg', administrationRoute: 'Oral', schedule: ['10:00'], instructions: 'Tomar con alimentos', remainingQuantity: 36, refillInterval: 30, reason: 'Plan indicado por su profesional', active: true },
      { id: 'med-vitamin-d', seniorId: DEMO_SENIOR_ID, name: 'Vitamina D', dose: '1 cápsula', administrationRoute: 'Oral', schedule: ['14:00'], instructions: '', remainingQuantity: 18, refillInterval: 30, reason: 'Suplementación', active: true },
      { id: 'med-atorvastatin', seniorId: DEMO_SENIOR_ID, name: 'Atorvastatina', dose: '20 mg', administrationRoute: 'Oral', schedule: ['21:00'], instructions: '', remainingQuantity: 26, refillInterval: 30, reason: 'Plan indicado por su profesional', active: true },
    ],
    medicationIntakes: [
      { id: 'intake-losartan-today', medicationId: 'med-losartan', seniorId: DEMO_SENIOR_ID, scheduledAt: scheduledAt('08:00'), takenAt: scheduledAt('08:03'), status: 'TAKEN' },
      { id: 'intake-metformin-today', medicationId: 'med-metformin', seniorId: DEMO_SENIOR_ID, scheduledAt: scheduledAt('10:00'), status: 'PENDING' },
    ],
    wellbeingCheckins: [],
    habits: [
      { id: 'habit-walk', seniorId: DEMO_SENIOR_ID, name: 'Caminata suave', category: 'PHYSICAL', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '17:00', endTime: '17:15', active: true },
      { id: 'habit-water', seniorId: DEMO_SENIOR_ID, name: 'Tomar agua', category: 'HEALTH', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '12:00', active: true },
      { id: 'habit-memory', seniorId: DEMO_SENIOR_ID, name: 'Ejercicio de memoria', category: 'COGNITION', daysOfWeek: [1, 3, 5], startTime: '16:00', active: true },
    ],
    habitCompletions: [],
    calendarEvents: calendar,
    emergencyContacts: [
      { id: 'contact-ana-demo', seniorId: DEMO_SENIOR_ID, name: 'Ana Hernández', relationship: 'Hija', relationshipKey: 'DAUGHTER', phone: '+52 55 0000 0000', availability: 'Disponible ahora', emergencyContact: true, primaryContact: true, active: true },
      { id: 'contact-luis-demo', seniorId: DEMO_SENIOR_ID, name: 'Luis Hernández', relationship: 'Hijo', relationshipKey: 'SON', phone: '+52 55 0000 0001', availability: 'Disponible por la tarde', emergencyContact: false, primaryContact: false, active: true },
    ],
    consents: [
      { id: 'consent-emergencies', seniorId: DEMO_SENIOR_ID, kind: 'emergencies', granted: true, updatedAt: new Date().toISOString() },
      { id: 'consent-medications', seniorId: DEMO_SENIOR_ID, kind: 'medications', granted: true, updatedAt: new Date().toISOString() },
      { id: 'consent-wellbeing', seniorId: DEMO_SENIOR_ID, kind: 'wellbeing', granted: true, updatedAt: new Date().toISOString() },
    ],
    emergencies: [], alerts: [], notifications: [],
    healthFollowups: [
      { id: 'followup-seed-bp', seniorId: DEMO_SENIOR_ID, healthUserId: DEMO_HEALTH_ID, date: localDate(), type: 'Control', note: 'Revisión de presión arterial', recommendation: 'Continuar el registro habitual.', nextReview: localDate(7), active: true },
    ],
    cognitiveSessions: [],
    voiceCommands: [],
    auditLogs: [
      { id: 'audit-3', actorUserId: 'Administración VITALIA', action: 'Inicio de sesión', resourceType: 'Sesión', occurredAt: '2026-09-30T08:05:00-06:00' },
      { id: 'audit-2', actorUserId: 'Sistema', action: 'Matriz de permisos inicial cargada', resourceType: 'Permisos', occurredAt: '2026-09-29T18:00:00-06:00' },
      { id: 'audit-1', actorUserId: 'Sistema', action: 'Roles del sistema creados', resourceType: 'Roles', occurredAt: '2026-09-29T17:55:00-06:00' },
    ],
  };
}

function isDatabase(value: unknown): value is MockDatabaseState {
  return !!value && typeof value === 'object' && (value as Partial<MockDatabaseState>).schemaVersion === 1
    && Array.isArray((value as Partial<MockDatabaseState>).users);
}

/** Fuente de verdad mock compartida. El JSON/seed inicia la demo y localStorage conserva las modificaciones. */
@Injectable({ providedIn: 'root' })
export class MockDatabaseService {
  private readonly state = signal<MockDatabaseState>(this.restore());
  readonly snapshot = this.state.asReadonly();

  constructor() { watchStorage(MOCK_DATABASE_KEY, () => this.state.set(this.restore())); }

  collection<K extends MockCollectionName>(name: K): Readonly<MockDatabaseState[K]> { return this.state()[name]; }

  updateCollection<K extends MockCollectionName>(name: K, update: (items: MockDatabaseState[K]) => MockDatabaseState[K]): void {
    this.state.update((current) => ({ ...current, [name]: update(current[name]) }));
    this.persist();
  }

  replace(next: MockDatabaseState): void { this.state.set(structuredClone(next)); this.persist(); }

  /** Elimina exclusivamente datos de VITALIA y vuelve a sembrar la demo. */
  resetDemoData(): void {
    try {
      const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key): key is string => !!key?.startsWith('vitalia.'));
      keys.forEach((key) => localStorage.removeItem(key));
    } catch { /* localStorage puede no estar disponible */ }
    this.state.set(createMockDatabaseSeed());
    this.persist();
  }

  private restore(): MockDatabaseState { return readStored(MOCK_DATABASE_KEY, isDatabase) ?? createMockDatabaseSeed(); }
  private persist(): void { writeStored(MOCK_DATABASE_KEY, this.state()); }
}

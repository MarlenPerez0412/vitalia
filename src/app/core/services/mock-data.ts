import { User } from '../models/domain.models';

export const MOCK_USERS: readonly User[] = [
  { id: 'usr-senior-demo', displayName: 'María Hernández', email: 'maria@demo.vitalia.mx', role: 'SENIOR', permissions: [], active: true },
  { id: 'usr-care-demo', displayName: 'Ana Hernández', email: 'ana@demo.vitalia.mx', role: 'CAREGIVER', permissions: [], active: true },
  { id: 'usr-health-demo', displayName: 'Dr. Ruiz', email: 'salud@demo.vitalia.mx', role: 'HEALTH', permissions: [], active: true },
  { id: 'usr-admin-demo', displayName: 'Administracion VITALIA', email: 'admin@demo.vitalia.mx', role: 'ADMIN', permissions: [], active: true },
] as const;

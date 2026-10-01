import { Role } from './domain.models';

/** Roles con navegacion propia. `INSTITUTION` queda reservado para una fase futura. */
export type ActiveRole = Exclude<Role, 'INSTITUTION'>;

export type PermissionCode =
  | 'VIEW_OWN_MEDICATIONS'
  | 'RECORD_MEDICATION_INTAKE'
  | 'VIEW_AUTHORIZED_MEDICATIONS'
  | 'VIEW_WELLBEING'
  | 'VIEW_COGNITION'
  | 'VIEW_LOCATION'
  | 'TRIGGER_EMERGENCY'
  | 'VIEW_EMERGENCY'
  | 'VIEW_REPORTS'
  | 'MANAGE_USERS'
  | 'MANAGE_ROLES'
  | 'MANAGE_PERMISSIONS'
  | 'VIEW_AUDIT';

export interface PermissionDefinition {
  code: PermissionCode;
  label: string;
  description: string;
  category: 'Salud' | 'Bienestar' | 'Seguridad' | 'Seguimiento' | 'Administración';
}

export interface RoleDefinition {
  code: string;
  label: string;
  description: string;
  active: boolean;
  /** Los roles del sistema no se pueden eliminar ni desactivar. */
  system: boolean;
}

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  SENIOR: 'Persona mayor',
  CAREGIVER: 'Familiar o cuidador',
  HEALTH: 'Profesional de salud',
  ADMIN: 'Administrador',
  INSTITUTION: 'Institución',
};

export const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  { code: 'SENIOR', label: 'Persona mayor', description: 'Gestiona su bienestar, medicación, consentimientos y red de apoyo.', active: true, system: true },
  { code: 'CAREGIVER', label: 'Familiar o cuidador', description: 'Acompaña a las personas vinculadas con la información que ellas autorizan.', active: true, system: true },
  { code: 'HEALTH', label: 'Profesional de salud', description: 'Da seguimiento a datos relevantes y autorizados, sin expediente clínico completo.', active: true, system: true },
  { code: 'ADMIN', label: 'Administrador', description: 'Gestiona usuarios, roles, permisos, configuración y auditoría.', active: true, system: true },
];

export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  { code: 'VIEW_OWN_MEDICATIONS', label: 'Ver sus medicamentos', description: 'Consultar el plan y los horarios propios.', category: 'Salud' },
  { code: 'RECORD_MEDICATION_INTAKE', label: 'Registrar tomas', description: 'Confirmar que se tomó un medicamento.', category: 'Salud' },
  { code: 'VIEW_AUTHORIZED_MEDICATIONS', label: 'Ver medicamentos autorizados', description: 'Consultar la adherencia de personas vinculadas.', category: 'Salud' },
  { code: 'VIEW_WELLBEING', label: 'Ver bienestar', description: 'Consultar check-ins y tendencias de bienestar.', category: 'Bienestar' },
  { code: 'VIEW_COGNITION', label: 'Ver cognición', description: 'Consultar actividades cognitivas y su progreso.', category: 'Bienestar' },
  { code: 'VIEW_LOCATION', label: 'Ver ubicación', description: 'Ver la ubicación compartida con consentimiento.', category: 'Seguridad' },
  { code: 'TRIGGER_EMERGENCY', label: 'Solicitar ayuda', description: 'Iniciar el flujo de emergencia.', category: 'Seguridad' },
  { code: 'VIEW_EMERGENCY', label: 'Ver emergencias', description: 'Consultar eventos de emergencia y su estado.', category: 'Seguridad' },
  { code: 'VIEW_REPORTS', label: 'Ver reportes', description: 'Consultar reportes de seguimiento autorizados.', category: 'Seguimiento' },
  { code: 'MANAGE_USERS', label: 'Gestionar usuarios', description: 'Dar de alta, editar y activar o desactivar usuarios.', category: 'Administración' },
  { code: 'MANAGE_ROLES', label: 'Gestionar roles', description: 'Crear, editar y activar o desactivar roles.', category: 'Administración' },
  { code: 'MANAGE_PERMISSIONS', label: 'Gestionar permisos', description: 'Asignar permisos a cada rol.', category: 'Administración' },
  { code: 'VIEW_AUDIT', label: 'Ver auditoría', description: 'Consultar el registro de acciones.', category: 'Administración' },
];

/** Matriz inicial rol x permiso (minimo privilegio). El backend futuro sera la autoridad. */
export const DEFAULT_ROLE_PERMISSIONS: Readonly<Record<ActiveRole, readonly PermissionCode[]>> = {
  SENIOR: ['VIEW_OWN_MEDICATIONS', 'RECORD_MEDICATION_INTAKE', 'VIEW_WELLBEING', 'VIEW_COGNITION', 'VIEW_LOCATION', 'TRIGGER_EMERGENCY', 'VIEW_EMERGENCY'],
  CAREGIVER: ['VIEW_AUTHORIZED_MEDICATIONS', 'VIEW_WELLBEING', 'VIEW_COGNITION', 'VIEW_LOCATION', 'VIEW_EMERGENCY', 'VIEW_REPORTS'],
  HEALTH: ['VIEW_AUTHORIZED_MEDICATIONS', 'VIEW_WELLBEING', 'VIEW_COGNITION', 'VIEW_REPORTS'],
  ADMIN: ['MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_PERMISSIONS', 'VIEW_AUDIT'],
};

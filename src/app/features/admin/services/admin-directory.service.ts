import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_CATALOG, PermissionCode, ROLE_DEFINITIONS, RoleDefinition } from '../../../core/models/access.models';
import { AuditLog } from '../../../core/models/domain.models';
import { MOCK_USERS } from '../../../core/services/mock-data';

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
}

export type DirectoryUserInput = Omit<DirectoryUser, 'id'>;
export type RoleInput = Pick<RoleDefinition, 'label' | 'description'>;

/** Permiso que no se puede retirar para evitar dejar la plataforma sin administracion. */
export const LOCKED_PERMISSION = { role: 'ADMIN', code: 'MANAGE_PERMISSIONS' as PermissionCode };

const SEED_PHONES: Readonly<Record<string, string>> = {
  'usr-senior-demo': '+52 55 0000 0010', 'usr-care-demo': '+52 55 0000 0000', 'usr-health-demo': '+52 55 0000 0020', 'usr-admin-demo': '+52 55 0000 0030',
};

/**
 * Directorio de administracion en memoria (usuarios, roles, matriz de permisos y auditoria).
 * Sin persistencia: se reinicia al recargar. El backend futuro sera la autoridad (ver docs/ROLES_PERMISSIONS.md).
 */
@Injectable({ providedIn: 'root' })
export class AdminDirectoryService {
  private readonly auth = inject(AuthService);

  readonly users = signal<readonly DirectoryUser[]>([
    ...MOCK_USERS.map((user) => ({ id: user.id, name: user.displayName, email: user.email, phone: SEED_PHONES[user.id] ?? '', role: user.role, active: user.active })),
    { id: 'usr-luis-demo', name: 'Luis Hernández', email: 'luis@demo.vitalia.mx', phone: '+52 55 0000 0001', role: 'CAREGIVER', active: false },
    { id: 'usr-paula-demo', name: 'Dra. Paula Méndez', email: 'paula@demo.vitalia.mx', phone: '+52 55 0000 0021', role: 'HEALTH', active: true },
  ]);
  readonly roles = signal<readonly RoleDefinition[]>(ROLE_DEFINITIONS.map((role) => ({ ...role })));
  readonly permissions = PERMISSION_CATALOG;
  readonly matrix = signal<Readonly<Record<string, readonly PermissionCode[]>>>({ ...DEFAULT_ROLE_PERMISSIONS });
  readonly audit = signal<readonly AuditLog[]>([
    { id: 'audit-3', actorUserId: 'Administracion VITALIA', action: 'Inicio de sesión', resourceType: 'Sesión', occurredAt: '2026-09-30T08:05:00-06:00' },
    { id: 'audit-2', actorUserId: 'Sistema', action: 'Matriz de permisos inicial cargada', resourceType: 'Permisos', occurredAt: '2026-09-29T18:00:00-06:00' },
    { id: 'audit-1', actorUserId: 'Sistema', action: 'Roles del sistema creados', resourceType: 'Roles', occurredAt: '2026-09-29T17:55:00-06:00' },
  ]);

  readonly activeUsers = computed(() => this.users().filter((user) => user.active).length);
  readonly activeRoles = computed(() => this.roles().filter((role) => role.active));

  createUser(input: DirectoryUserInput): DirectoryUser {
    const user: DirectoryUser = { ...input, id: `usr-${Date.now()}` };
    this.users.update((items) => [...items, user]);
    this.log('Alta de usuario', 'Usuarios', user.email);
    return user;
  }

  updateUser(id: string, input: DirectoryUserInput): void {
    this.users.update((items) => items.map((user) => (user.id === id ? { ...user, ...input } : user)));
    this.log('Edición de usuario', 'Usuarios', input.email);
  }

  toggleUser(id: string): void {
    const user = this.users().find((item) => item.id === id);
    if (!user) return;
    this.users.update((items) => items.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
    this.log(user.active ? 'Usuario desactivado' : 'Usuario activado', 'Usuarios', user.email);
  }

  createRole(input: RoleInput): RoleDefinition {
    const code = input.label.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || `ROL_${Date.now()}`;
    const role: RoleDefinition = { code, label: input.label, description: input.description, active: true, system: false };
    this.roles.update((items) => [...items, role]);
    this.matrix.update((matrix) => ({ ...matrix, [code]: [] }));
    this.log('Alta de rol', 'Roles', code);
    return role;
  }

  updateRole(code: string, input: RoleInput): void {
    this.roles.update((items) => items.map((role) => (role.code === code ? { ...role, ...input } : role)));
    this.log('Edición de rol', 'Roles', code);
  }

  /** ADMIN no se puede desactivar: evitaria perder el acceso a la administracion. */
  canToggleRole(code: string): boolean { return code !== 'ADMIN'; }

  toggleRole(code: string): void {
    if (!this.canToggleRole(code)) return;
    const role = this.roles().find((item) => item.code === code);
    if (!role) return;
    this.roles.update((items) => items.map((item) => (item.code === code ? { ...item, active: !item.active } : item)));
    this.log(role.active ? 'Rol desactivado' : 'Rol activado', 'Roles', code);
  }

  hasPermission(role: string, code: PermissionCode): boolean { return this.matrix()[role]?.includes(code) ?? false; }

  isLocked(role: string, code: PermissionCode): boolean { return role === LOCKED_PERMISSION.role && code === LOCKED_PERMISSION.code; }

  togglePermission(role: string, code: PermissionCode): void {
    if (this.isLocked(role, code)) return;
    const granted = this.hasPermission(role, code);
    this.matrix.update((matrix) => ({ ...matrix, [role]: granted ? (matrix[role] ?? []).filter((item) => item !== code) : [...(matrix[role] ?? []), code] }));
    this.log(granted ? 'Permiso retirado' : 'Permiso asignado', 'Permisos', `${role} · ${code}`);
  }

  private log(action: string, resourceType: string, resourceId: string): void {
    const entry: AuditLog = { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, actorUserId: this.auth.currentUser()?.displayName ?? 'Sistema', action, resourceType, resourceId, occurredAt: new Date().toISOString() };
    this.audit.update((items) => [entry, ...items]);
  }
}

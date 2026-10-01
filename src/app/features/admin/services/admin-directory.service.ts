import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { PERMISSION_CATALOG, PermissionCode, RoleDefinition } from '../../../core/models/access.models';
import { AuditLog } from '../../../core/models/domain.models';
import { MockDatabaseService } from '../../../core/services/mock-database.service';
import { NotificationEventsService } from '../../../core/services/notification-events.service';

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

/**
 * Directorio de administración persistente en la base mock compartida.
 * El backend futuro será la autoridad (ver docs/ROLES_PERMISSIONS.md).
 */
@Injectable({ providedIn: 'root' })
export class AdminDirectoryService {
  private readonly auth = inject(AuthService);
  private readonly notificationEvents = inject(NotificationEventsService);
  private readonly database = inject(MockDatabaseService);

  readonly users = computed<readonly DirectoryUser[]>(() => this.database.snapshot().users);
  readonly roles = computed<readonly RoleDefinition[]>(() => this.database.snapshot().roles);
  readonly permissions = PERMISSION_CATALOG;
  readonly matrix = computed<Readonly<Record<string, readonly PermissionCode[]>>>(() => this.database.snapshot().permissions);
  readonly audit = computed<readonly AuditLog[]>(() => this.database.snapshot().auditLogs);

  readonly activeUsers = computed(() => this.users().filter((user) => user.active).length);
  readonly activeRoles = computed(() => this.roles().filter((role) => role.active));

  createUser(input: DirectoryUserInput): DirectoryUser {
    const user: DirectoryUser = { ...input, id: `usr-${Date.now()}` };
    this.database.updateCollection('users', (items) => [...items, user]);
    this.log('Alta de usuario', 'Usuarios', user.email);
    return user;
  }

  updateUser(id: string, input: DirectoryUserInput): void {
    this.database.updateCollection('users', (items) => items.map((user) => (user.id === id ? { ...user, ...input } : user)));
    this.log('Edición de usuario', 'Usuarios', input.email);
  }

  toggleUser(id: string): void {
    const user = this.users().find((item) => item.id === id);
    if (!user) return;
    this.database.updateCollection('users', (items) => items.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
    this.log(user.active ? 'Usuario desactivado' : 'Usuario activado', 'Usuarios', user.email);
  }

  createRole(input: RoleInput): RoleDefinition {
    const code = input.label.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || `ROL_${Date.now()}`;
    const role: RoleDefinition = { code, label: input.label, description: input.description, active: true, system: false };
    this.database.updateCollection('roles', (items) => [...items, role]);
    this.database.updateCollection('permissions', (matrix) => ({ ...matrix, [code]: [] }));
    this.log('Alta de rol', 'Roles', code);
    return role;
  }

  updateRole(code: string, input: RoleInput): void {
    this.database.updateCollection('roles', (items) => items.map((role) => (role.code === code ? { ...role, ...input } : role)));
    this.log('Edición de rol', 'Roles', code);
  }

  /** ADMIN no se puede desactivar: evitaria perder el acceso a la administracion. */
  canToggleRole(code: string): boolean { return code !== 'ADMIN'; }

  toggleRole(code: string): void {
    if (!this.canToggleRole(code)) return;
    const role = this.roles().find((item) => item.code === code);
    if (!role) return;
    this.database.updateCollection('roles', (items) => items.map((item) => (item.code === code ? { ...item, active: !item.active } : item)));
    this.log(role.active ? 'Rol desactivado' : 'Rol activado', 'Roles', code);
  }

  hasPermission(role: string, code: PermissionCode): boolean { return this.matrix()[role]?.includes(code) ?? false; }

  isLocked(role: string, code: PermissionCode): boolean { return role === LOCKED_PERMISSION.role && code === LOCKED_PERMISSION.code; }

  togglePermission(role: string, code: PermissionCode): void {
    if (this.isLocked(role, code)) return;
    const granted = this.hasPermission(role, code);
    this.database.updateCollection('permissions', (matrix) => ({ ...matrix, [role]: granted ? (matrix[role] ?? []).filter((item) => item !== code) : [...(matrix[role] ?? []), code] }));
    this.log(granted ? 'Permiso retirado' : 'Permiso asignado', 'Permisos', `${role} · ${code}`);
  }

  private log(action: string, resourceType: string, resourceId: string): void {
    const entry: AuditLog = { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, actorUserId: this.auth.currentUser()?.displayName ?? 'Sistema', action, resourceType, resourceId, occurredAt: new Date().toISOString() };
    this.database.updateCollection('auditLogs', (items) => [entry, ...items]);
    this.notificationEvents.adminAudit(action, resourceType, resourceId, entry.id);
  }
}

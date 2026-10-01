import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminDirectoryService } from './admin-directory.service';

describe('AdminDirectoryService', () => {
  let directory: AdminDirectoryService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(AuthService).loginAs('ADMIN');
    directory = TestBed.inject(AdminDirectoryService);
  });

  it('creates, edits and toggles users, auditing each action', () => {
    const before = directory.audit().length;
    const user = directory.createUser({ name: 'Carmen Ruiz', email: 'carmen@demo.vitalia.mx', phone: '+52 55 0000 0099', role: 'CAREGIVER', active: true });
    directory.updateUser(user.id, { ...user, phone: '+52 55 0000 0098' });
    directory.toggleUser(user.id);
    const saved = directory.users().find((item) => item.id === user.id);
    expect(saved).toMatchObject({ phone: '+52 55 0000 0098', active: false });
    expect(directory.audit().length).toBe(before + 3);
    expect(directory.audit()[0]).toMatchObject({ action: 'Usuario desactivado', actorUserId: 'Administracion VITALIA' });
  });

  it('creates roles with a code and protects ADMIN from being disabled', () => {
    const role = directory.createRole({ label: 'Coordinación clínica', description: 'Rol personalizado' });
    expect(role.code).toBe('COORDINACION_CLINICA');
    directory.toggleRole('ADMIN');
    expect(directory.roles().find((item) => item.code === 'ADMIN')?.active).toBe(true);
    directory.toggleRole(role.code);
    expect(directory.roles().find((item) => item.code === role.code)?.active).toBe(false);
  });

  it('toggles the role x permission matrix except the locked admin permission', () => {
    expect(directory.hasPermission('SENIOR', 'VIEW_OWN_MEDICATIONS')).toBe(true);
    directory.togglePermission('SENIOR', 'VIEW_OWN_MEDICATIONS');
    expect(directory.hasPermission('SENIOR', 'VIEW_OWN_MEDICATIONS')).toBe(false);
    directory.togglePermission('ADMIN', 'MANAGE_PERMISSIONS');
    expect(directory.hasPermission('ADMIN', 'MANAGE_PERMISSIONS')).toBe(true);
    expect(directory.hasPermission('CAREGIVER', 'MANAGE_USERS')).toBe(false);
  });
});

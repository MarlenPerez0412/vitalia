import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { EmergencyRegistryService } from './emergency-registry.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  function setup() {
    localStorage.clear();
    TestBed.configureTestingModule({});
    return { auth: TestBed.inject(AuthService), service: TestBed.inject(NotificationService) };
  }

  afterEach(() => localStorage.clear());

  it('shows each role only its own notifications', () => {
    const { auth, service } = setup();
    auth.loginAs('SENIOR');
    expect(service.mine().every((item) => item.targetRole === 'SENIOR')).toBe(true);
    expect(service.mine().some((item) => item.message.includes('Metformina'))).toBe(true);
    auth.loginAs('ADMIN');
    expect(service.mine().every((item) => item.targetRole === 'ADMIN')).toBe(true);
    auth.loginAs('HEALTH');
    expect(service.mine().some((item) => item.message.includes('Metformina'))).toBe(false);
  });

  it('marks one and all as read and lowers the unread count', () => {
    const { auth, service } = setup();
    auth.loginAs('SENIOR');
    const before = service.unreadCount();
    service.markAsRead(service.mine().find((item) => !item.read)!.id);
    expect(service.unreadCount()).toBe(before - 1);
    service.markAllAsRead();
    expect(service.unreadCount()).toBe(0);
    auth.loginAs('CAREGIVER');
    expect(service.unreadCount()).toBeGreaterThan(0);
  });

  it('persists changes in localStorage across instances', () => {
    const { auth, service } = setup();
    auth.loginAs('SENIOR');
    service.markAllAsRead();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    TestBed.inject(AuthService).loginAs('SENIOR');
    expect(TestBed.inject(NotificationService).unreadCount()).toBe(0);
  });

  it('does not repeat an equivalent unread notification', () => {
    const { auth, service } = setup();
    auth.loginAs('ADMIN');
    const input = { targetRole: 'ADMIN', targetUserId: 'usr-admin-demo', type: 'ADMIN', title: 'X', message: 'Y', priority: 'LOW' } as const;
    expect(service.notify(input)).not.toBeNull();
    expect(service.notify(input)).toBeNull();
  });

  it('resets to the seed', () => {
    const { auth, service } = setup();
    auth.loginAs('SENIOR');
    const initial = service.unreadCount();
    service.markAllAsRead();
    service.resetNotifications();
    expect(service.unreadCount()).toBe(initial);
  });

  it('notifies the caregiver when María registers an emergency, and not health', () => {
    const { auth, service } = setup();
    TestBed.inject(EmergencyRegistryService).record({ seniorName: 'María Hernández', reason: 'Ayuda', type: 'HELP', source: 'BUTTON' });
    auth.loginAs('CAREGIVER');
    const emergency = service.mine().find((item) => item.type === 'EMERGENCY')!;
    expect(emergency.message).toBe('María Hernández solicitó ayuda.');
    expect(emergency.actionRoute).toBe('/care/emergencies');
    expect(emergency.priority).toBe('CRITICAL');
    auth.loginAs('HEALTH');
    expect(service.mine().some((item) => item.type === 'EMERGENCY')).toBe(false);
  });
});

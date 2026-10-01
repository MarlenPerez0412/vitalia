import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { HealthFollowUpService } from '../../features/health/services/health-follow-up.service';
import { SeniorStateService } from '../../features/senior/services/senior-state.service';
import { EmergencyRegistryService } from './emergency-registry.service';
import { NotificationService } from './notification.service';
import { SharingConsentService } from './sharing-consent.service';
import { NotificationEventsService } from './notification-events.service';

describe('Notifications: sync, consent and events', () => {
  function setup() {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return {
      auth: TestBed.inject(AuthService),
      notifications: TestBed.inject(NotificationService),
      consent: TestBed.inject(SharingConsentService),
      registry: TestBed.inject(EmergencyRegistryService),
    };
  }
  const help = { seniorName: 'María Hernández', reason: 'Ayuda', type: 'HELP', source: 'BUTTON' } as const;

  afterEach(() => localStorage.clear());

  it('reflects changes written by another tab through the storage event', () => {
    const { auth, notifications } = setup();
    auth.loginAs('CAREGIVER');
    const before = notifications.unreadCount();
    const stored = JSON.parse(localStorage.getItem('vitalia.notifications') ?? 'null') ?? [];
    expect(stored).toEqual([]);
    // Otra pestana (Maria) registra una emergencia y escribe en localStorage.
    const other = [{ id: 'ntf-x', targetRole: 'CAREGIVER', targetUserId: 'usr-care-demo', type: 'EMERGENCY', title: 'Solicitud de ayuda', message: 'María Hernández solicitó ayuda.', createdAt: new Date().toISOString(), read: false, priority: 'CRITICAL' }];
    localStorage.setItem('vitalia.notifications', JSON.stringify(other));
    window.dispatchEvent(new StorageEvent('storage', { key: 'vitalia.notifications' }));
    expect(notifications.unreadCount()).toBe(1);
    expect(before).toBeGreaterThan(0);
  });

  it('shares emergencies across tabs without persisting coordinates', () => {
    const { registry } = setup();
    registry.record({ ...help, latitude: 19.4, longitude: -99.1, accuracy: 10, locationSource: 'REAL' });
    const saved = JSON.parse(localStorage.getItem('vitalia.emergencies')!);
    expect(saved[0].latitude).toBeUndefined();
    expect(saved[0].locationSource).toBe('REAL');
    expect(registry.latest()?.latitude).toBe(19.4);
  });

  it('marks an emergency as attended and notifies Senior and Caregiver', () => {
    const { auth, notifications, registry } = setup();
    const event = registry.record(help);
    registry.markAttended(event.id);
    expect(registry.latest()?.status).toBe('ATTENDED');
    auth.loginAs('SENIOR');
    expect(notifications.mine().some((item) => item.message === 'Tu familiar atendió tu solicitud de ayuda.')).toBe(true);
    auth.loginAs('CAREGIVER');
    expect(notifications.mine().some((item) => item.title === 'Emergencia atendida')).toBe(true);
  });

  it('does not notify the caregiver when María stopped sharing emergencies, and notifies the change', () => {
    const { auth, notifications, consent, registry } = setup();
    const events = TestBed.inject(NotificationEventsService);
    events.sharingChanged('emergencies', consent.toggle('emergencies'));
    auth.loginAs('CAREGIVER');
    expect(notifications.mine().some((item) => item.message === 'María Hernández revocó compartir Emergencias.')).toBe(true);
    registry.record(help);
    expect(notifications.mine().some((item) => item.message === 'María Hernández solicitó ayuda.')).toBe(false);
  });

  it('notifies the caregiver of a skipped medication when María shares medications', () => {
    const { auth, notifications } = setup();
    TestBed.inject(SeniorStateService).skipMedication('med-metformin');
    auth.loginAs('CAREGIVER');
    expect(notifications.mine().some((item) => item.message.includes('omitió Metformina'))).toBe(true);
  });

  it('notifies the caregiver of a concerning check-in and clears the Senior reminder', () => {
    const { auth, notifications } = setup();
    TestBed.inject(SeniorStateService).saveWellbeing({ mood: 1, sleep: 4, discomfort: 'No tengo molestias', note: '' });
    auth.loginAs('CAREGIVER');
    expect(notifications.mine().some((item) => item.message.includes('cambio en su bienestar'))).toBe(true);
    auth.loginAs('SENIOR');
    expect(notifications.mine().find((item) => item.type === 'WELLBEING')?.read).toBe(true);
  });

  it('registers a follow-up: notifies Health and Senior', () => {
    const { auth, notifications } = setup();
    TestBed.inject(HealthFollowUpService).register('María Hernández', 'Control de seguimiento');
    auth.loginAs('HEALTH');
    expect(notifications.mine().some((item) => item.title === 'Seguimiento registrado')).toBe(true);
    auth.loginAs('SENIOR');
    expect(notifications.mine().some((item) => item.title === 'Seguimiento de tu profesional')).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { EmergencyRegistryService } from '../../../core/services/emergency-registry.service';
import { AdminDirectoryService } from '../../../features/admin/services/admin-directory.service';
import { NotificationBellComponent } from './notification-bell.component';

describe('NotificationBellComponent', () => {
  async function render(role: 'SENIOR' | 'CAREGIVER' | 'ADMIN' = 'SENIOR') {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [NotificationBellComponent], providers: [provideRouter([])] }).compileComponents();
    TestBed.inject(AuthService).loginAs(role);
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, trigger: () => root.querySelector<HTMLButtonElement>('.icon-button')! };
  }
  const badge = (root: HTMLElement) => root.querySelector('.count')?.textContent?.trim();

  afterEach(() => localStorage.clear());

  it('shows the unread badge and an accessible label', async () => {
    const { root, trigger } = await render();
    expect(badge(root)).toBe('2');
    expect(trigger().getAttribute('aria-label')).toContain('2 notificaciones sin leer');
  });

  it('opens a notification: marks it read, closes and navigates', async () => {
    const { root, trigger } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    trigger().click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeTruthy());
    root.querySelector<HTMLButtonElement>('li .open')!.click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeNull());
    expect(navigate).toHaveBeenCalledWith('/senior/medications');
    expect(badge(root)).toBe('1');
  });

  it('marks all as read and removes the badge', async () => {
    const { root, trigger } = await render();
    trigger().click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeTruthy());
    root.querySelector<HTMLButtonElement>('.head .link')!.click();
    await vi.waitFor(() => expect(badge(root)).toBeUndefined());
  });

  it('closes with Escape', async () => {
    const { root, trigger } = await render();
    trigger().click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeTruthy());
    root.querySelector('.panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeNull());
  });

  it('caps the badge at 9+', async () => {
    const { root } = await render('CAREGIVER');
    const registry = TestBed.inject(EmergencyRegistryService);
    for (let i = 0; i < 10; i++) registry.record({ seniorName: 'María Hernández', reason: 'Ayuda', type: 'HELP', source: 'BUTTON' });
    await vi.waitFor(() => expect(badge(root)).toBe('9+'));
  });

  it('shows the user-created notice to Admin', async () => {
    const { root, trigger } = await render('ADMIN');
    TestBed.inject(AdminDirectoryService).createUser({ name: 'Demo', email: 'demo@vitalia.mx', phone: '', role: 'SENIOR', active: true });
    trigger().click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeTruthy());
    expect(root.querySelector('.panel')!.textContent).toContain('Usuario creado correctamente.');
  });
});

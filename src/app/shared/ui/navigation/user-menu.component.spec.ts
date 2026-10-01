import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  async function render(role: 'SENIOR' | 'ADMIN' = 'SENIOR') {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [UserMenuComponent], providers: [provideRouter([])] }).compileComponents();
    TestBed.inject(AuthService).loginAs(role);
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, trigger: root.querySelector<HTMLButtonElement>('.trigger')! };
  }

  it('shows avatar, name, email and role when opened', async () => {
    const { root, trigger } = await render();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeTruthy());
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const identity = root.querySelector('.identity')!.textContent!;
    expect(identity).toContain('María Hernández');
    expect(identity).toContain('maria@demo.vitalia.mx');
    expect(identity).toContain('Persona mayor');
  });

  it('closes with Escape and with a click outside', async () => {
    const { root, trigger } = await render();
    trigger.click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeTruthy());
    root.querySelector('.panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeNull());
    trigger.click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeTruthy());
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeNull());
  });

  it('moves focus with the arrow keys', async () => {
    const { root, trigger } = await render();
    trigger.click();
    await vi.waitFor(() => expect(document.activeElement?.textContent).toContain('Mi perfil'));
    root.querySelector('.panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('Configuración');
    root.querySelector('.panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('Cerrar sesión');
  });

  it('routes profile and settings per role and logs out to /login', async () => {
    const { root, trigger } = await render('ADMIN');
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    trigger.click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeTruthy());
    const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.panel > button'));
    buttons()[1].click();
    expect(navigateByUrl).toHaveBeenCalledWith('/admin/settings');
    trigger.click();
    await vi.waitFor(() => expect(root.querySelector('.panel')).toBeTruthy());
    buttons()[2].click();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(TestBed.inject(AuthService).currentUser()).toBeNull();
  });
});

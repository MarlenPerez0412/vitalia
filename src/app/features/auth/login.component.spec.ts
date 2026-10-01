import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DEMO_PASSWORD } from '../../core/auth/auth-backend';
import { AuthService } from '../../core/auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let navigate: ReturnType<typeof vi.spyOn>;

  async function render(): Promise<HTMLElement> {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [LoginComponent], providers: [provideRouter([])] }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function type(root: HTMLElement, selector: string, value: string): void {
    const input = root.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(root: HTMLElement): Promise<void> {
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await vi.waitFor(() => expect(root.querySelector('[role="alert"], .field-error') ?? navigate.mock.calls.length).toBeTruthy());
  }

  it('shows the professional login with brand message and form fields', async () => {
    const root = await render();
    expect(root.textContent).toContain('Más autonomía, bienestar y seguridad para una vida plena.');
    expect(root.textContent).toContain('LIA, tu compañera inteligente.');
    expect(root.querySelector('label[for="login-email"]')?.textContent).toContain('Correo');
    expect(root.querySelector('label[for="login-password"]')?.textContent).toContain('Contraseña');
    expect(root.textContent).toContain('¿Olvidaste tu contraseña?');
  });

  it('validates the fields before submitting', async () => {
    const root = await render();
    await submit(root);
    expect(root.querySelectorAll('.field-error').length).toBe(2);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signs in with credentials and goes to the role home', async () => {
    const root = await render();
    type(root, '#login-email', 'salud@demo.vitalia.mx');
    type(root, '#login-password', DEMO_PASSWORD);
    await submit(root);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/health'));
  });

  it('explains wrong credentials without navigating', async () => {
    const root = await render();
    type(root, '#login-email', 'salud@demo.vitalia.mx');
    type(root, '#login-password', 'otra');
    await submit(root);
    await vi.waitFor(() => expect(root.querySelector('.form-error')?.textContent).toContain('no son correctos'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the demo profiles behind "Entrar en modo demostración"', async () => {
    const root = await render();
    expect(root.textContent).not.toContain('MODO DEMOSTRACIÓN');
    const toggle = root.querySelector<HTMLButtonElement>('.demo-toggle')!;
    toggle.click();
    await vi.waitFor(() => expect(root.textContent).toContain('MODO DEMOSTRACIÓN'));
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const roles = Array.from(root.querySelectorAll<HTMLButtonElement>('.role'));
    expect(roles.map((role) => role.querySelector('strong')?.textContent)).toEqual(['Persona mayor', 'Familiar o cuidador', 'Profesional de salud', 'Administración']);
    roles[1].click();
    expect(navigate).toHaveBeenCalledWith('/care');
    expect(TestBed.inject(AuthService).currentUser()?.role).toBe('CAREGIVER');
  });
});

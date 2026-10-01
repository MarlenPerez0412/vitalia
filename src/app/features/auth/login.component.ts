import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthError, DEMO_PASSWORD, DemoRole } from '../../core/auth/auth-backend';
import { AuthService } from '../../core/auth/auth.service';
import { AppButtonComponent } from '../../shared/ui/button/app-button.component';
import { VitaliaIconComponent, VitaliaIconName } from '../../shared/ui/icon/vitalia-icon.component';

interface DemoAccess {
  role: DemoRole;
  label: string;
  description: string;
  icon: VitaliaIconName;
  tone: 'senior' | 'care' | 'health' | 'admin';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, ReactiveFormsModule, VitaliaIconComponent],
  selector: 'app-login',
  template: `
    <main class="login">
      <section class="brand-side" aria-labelledby="brand-title">
        <div class="brand-side__inner">
          <p class="logo"><img src="vitalia-icon.jpg" alt="" aria-hidden="true" class="logo__mark" /><span class="logo__word">VITALIA</span></p>
          <h1 id="brand-title">Más autonomía, bienestar y seguridad para una vida plena.</h1>
          <div class="lia-card">
            <span class="lia-card__orb" aria-hidden="true"><app-vitalia-icon name="sparkles" [size]="28" /></span>
            <p><strong>LIA, tu compañera inteligente.</strong><span>Te acompaña con recordatorios, orientación y ayuda cuando la necesitas.</span></p>
          </div>
          <ul class="pillars" aria-label="Lo que encontrarás en VITALIA">
            <li class="pillar pillar--health"><app-vitalia-icon name="heart" [size]="20" /><span>Salud y medicamentos</span></li>
            <li class="pillar pillar--security"><app-vitalia-icon name="shield" [size]="20" /><span>Seguridad con consentimiento</span></li>
            <li class="pillar pillar--family"><app-vitalia-icon name="users" [size]="20" /><span>Tu red de apoyo</span></li>
          </ul>
        </div>
      </section>

      <section class="form-side" aria-labelledby="login-title">
        <div class="card">
          <h2 id="login-title">Iniciar sesión</h2>
          <p class="lead">Accede con tu cuenta de VITALIA.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="v-field">
              <label for="login-email">Correo</label>
              <input id="login-email" class="v-input" type="email" formControlName="email" autocomplete="username" inputmode="email"
                [attr.aria-invalid]="invalid('email')" [attr.aria-describedby]="invalid('email') ? 'login-email-error' : null" />
              @if (invalid('email')) { <p id="login-email-error" class="field-error">Escribe un correo válido.</p> }
            </div>
            <div class="v-field">
              <label for="login-password">Contraseña</label>
              <div class="password">
                <input id="login-password" class="v-input" [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password"
                  [attr.aria-invalid]="invalid('password')" [attr.aria-describedby]="invalid('password') ? 'login-password-error' : null" />
                <button type="button" class="reveal" [attr.aria-pressed]="showPassword()" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'" (click)="showPassword.set(!showPassword())">
                  {{ showPassword() ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              @if (invalid('password')) { <p id="login-password-error" class="field-error">Escribe tu contraseña.</p> }
            </div>

            @if (error()) { <p class="form-error" role="alert"><app-vitalia-icon name="alert" [size]="20" />{{ error() }}</p> }

            <app-button type="submit" [block]="true" [loading]="submitting()" loadingLabel="Entrando…">Iniciar sesión</app-button>
            <button type="button" class="link" (click)="forgotOpen.set(true)">¿Olvidaste tu contraseña?</button>
            @if (forgotOpen()) {
              <p class="notice" role="status">La recuperación de contraseña estará disponible cuando se conecte la autenticación real. Mientras tanto, usa el modo demostración.</p>
            }
          </form>

          <div class="divider" aria-hidden="true"><span>o</span></div>

          <button type="button" class="demo-toggle" aria-controls="demo-panel" [attr.aria-expanded]="demoOpen()" (click)="demoOpen.set(!demoOpen())">
            <app-vitalia-icon name="sparkles" [size]="20" /><span>Entrar en modo demostración</span>
          </button>

          @if (demoOpen()) {
            <section id="demo-panel" class="demo" aria-labelledby="demo-title">
              <p class="demo__eyebrow" id="demo-title">MODO DEMOSTRACIÓN</p>
              <p class="demo__lead">Presenta VITALIA sin escribir credenciales. Los datos son ficticios.</p>
              <div class="role-grid">
                @for (access of demoAccess; track access.role) {
                  <button type="button" [class]="'role role--' + access.tone" (click)="enterDemo(access.role)">
                    <span class="role__icon" aria-hidden="true"><app-vitalia-icon [name]="access.icon" [size]="24" /></span>
                    <span class="role__text"><strong>{{ access.label }}</strong><small>{{ access.description }}</small></span>
                  </button>
                }
              </div>
              <p class="demo__hint">También puedes iniciar sesión con un correo de demostración (por ejemplo, maria&#64;demo.vitalia.mx) y la contraseña «{{ demoPassword }}».</p>
            </section>
          }
        </div>
      </section>
    </main>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly demoAccess: readonly DemoAccess[] = [
    { role: 'SENIOR', label: 'Persona mayor', description: 'Mi bienestar y actividades', icon: 'user', tone: 'senior' },
    { role: 'CAREGIVER', label: 'Familiar o cuidador', description: 'Acompañamiento y alertas', icon: 'users', tone: 'care' },
    { role: 'HEALTH', label: 'Profesional de salud', description: 'Seguimiento autorizado', icon: 'heart', tone: 'health' },
    { role: 'ADMIN', label: 'Administración', description: 'Gestión de la plataforma', icon: 'shield', tone: 'admin' },
  ];
  protected readonly demoPassword = DEMO_PASSWORD;
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly forgotOpen = signal(false);
  protected readonly demoOpen = signal(false);
  private readonly submitted = signal(false);

  protected invalid(control: 'email' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const user = await this.auth.signIn(email, password);
      void this.router.navigateByUrl(this.auth.redirectFor(user, this.route.snapshot.queryParamMap.get('returnUrl')));
    } catch (error) {
      this.error.set(error instanceof AuthError ? error.message : 'No pudimos iniciar sesión. Inténtalo nuevamente.');
    } finally {
      this.submitting.set(false);
    }
  }

  protected enterDemo(role: DemoRole): void {
    const user = this.auth.loginAs(role);
    void this.router.navigateByUrl(this.auth.redirectFor(user, this.route.snapshot.queryParamMap.get('returnUrl')));
  }
}

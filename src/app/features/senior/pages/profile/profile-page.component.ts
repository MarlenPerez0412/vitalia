import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SENIOR_DEMO_PROFILE } from '../../../../core/services/senior-mock-data';
import { ModuleTileColor } from '../../../../shared/ui/cards/module-tile.component';
import { VitaliaIconComponent, VitaliaIconName } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

interface ProfileOption { title: string; description: string; icon: VitaliaIconName; color: ModuleTileColor; route?: string; }

export function ageFrom(birthDate: string, today = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return age;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-profile-page',
  template: `
    <app-senior-page eyebrow="Mi información" title="Perfil" description="Tus datos y preferencias, siempre bajo tu control." backPath="/senior">
      <section class="identity" aria-label="Mis datos principales">
        <img class="identity__avatar" src="https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=300&h=300&fit=crop&crop=face" alt="Foto de María Hernández" />
        <div>
          <h2>{{ profile.name }}</h2>
          <p>{{ age }} años · {{ profile.healthInstitution }}</p>
        </div>
      </section>
      @if (notice()) { <div class="senior-page__notice" role="status"><app-vitalia-icon name="check" /><p><strong>Información de demostración</strong><span>{{ notice() }}</span></p></div> }
      <ul class="options" aria-label="Opciones de perfil">
        @for (option of options; track option.title) {
          <li>
            <button type="button" [class]="'option option--' + option.color" (click)="open(option)">
              <span class="option__icon" aria-hidden="true"><app-vitalia-icon [name]="option.icon" [size]="26" /></span>
              <span class="option__text"><strong>{{ option.title }}</strong><small>{{ option.description }}</small></span>
              <app-vitalia-icon class="option__arrow" name="chevron-right" [size]="22" />
            </button>
          </li>
        }
      </ul>
    </app-senior-page>
  `,
  styles: `
    .identity { align-items: center; background: linear-gradient(135deg, color-mix(in srgb, var(--color-module-security) 40%, white), color-mix(in srgb, var(--color-module-family) 40%, white)); border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-6) var(--space-4); text-align: center; }
    .identity__avatar { border: .35rem solid var(--color-surface); border-radius: 50%; box-shadow: var(--shadow-md); display: block; height: 7.5rem; object-fit: cover; width: 7.5rem; }
    .identity h2 { font-size: var(--font-size-heading); line-height: var(--line-height-tight); margin: 0; }
    .identity p { color: var(--color-text-on-tint); font-size: var(--font-size-lead); font-weight: 700; margin: var(--space-1) 0 0; }
    .options { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); list-style: none; margin: 0; padding: 0; }
    .option { --option-chip: var(--color-module-security); align-items: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); color: var(--color-text); cursor: pointer; display: grid; gap: var(--space-3); grid-template-columns: auto minmax(0, 1fr) auto; min-height: 4.75rem; padding: var(--space-3) var(--space-4); text-align: left; transition: border-color var(--motion-fast), box-shadow var(--motion-fast); width: 100%; }
    .option:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-sm); }
    .option__icon { align-items: center; background: var(--option-chip); border-radius: var(--radius-md); display: inline-flex; height: 3rem; justify-content: center; width: 3rem; }
    .option__text { display: grid; min-width: 0; }
    .option__text small { color: var(--color-text-muted); }
    .option__arrow { color: var(--color-text-muted); }
    .option--coral { --option-chip: var(--color-module-health); }
    .option--yellow { --option-chip: var(--color-module-pensions); }
    .option--lilac { --option-chip: var(--color-module-selfcare); }
    .option--green { --option-chip: var(--color-module-security); }
    .option--blue { --option-chip: var(--color-module-entertainment); }
    .option--turquoise { --option-chip: var(--color-module-family); }
    .option--teal { --option-chip: var(--color-primary-soft); }
  `,
})
export class ProfilePageComponent {
  private readonly router = inject(Router);
  protected readonly profile = SENIOR_DEMO_PROFILE;
  protected readonly age = ageFrom(SENIOR_DEMO_PROFILE.birthDate);
  protected readonly initials = SENIOR_DEMO_PROFILE.name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('');
  protected readonly notice = signal('');
  protected readonly options: readonly ProfileOption[] = [
    { title: 'Mis datos', description: 'Nombre, fecha de nacimiento y contacto.', icon: 'user', color: 'teal' },
    { title: 'Mis medicamentos', description: 'Tu plan actual y horarios.', icon: 'pill', color: 'coral', route: '/senior/medications' },
    { title: 'Mis cuidadores', description: 'Quién te acompaña y qué puede ver.', icon: 'users', color: 'turquoise', route: '/senior/family' },
    { title: 'Mis familiares', description: 'Tu red de apoyo autorizada.', icon: 'heart', color: 'blue', route: '/senior/family' },
    { title: 'Mis instituciones de salud', description: 'IMSS · dato de demostración.', icon: 'shield', color: 'green' },
    { title: 'Privacidad', description: 'Lo que compartes y con quién.', icon: 'lock', color: 'lilac', route: '/senior/privacy' },
    { title: 'Accesibilidad', description: 'Adapta VITALIA a tus preferencias.', icon: 'sparkles', color: 'yellow', route: '/senior/accessibility' },
    { title: 'Configuración', description: 'Comandos de voz y permisos.', icon: 'settings', color: 'teal', route: '/senior/settings' },
  ];

  protected open(option: ProfileOption): void {
    if (option.route) { void this.router.navigateByUrl(option.route); return; }
    this.notice.set(`${option.title} usa información ficticia y quedará conectado en una fase posterior.`);
  }
}

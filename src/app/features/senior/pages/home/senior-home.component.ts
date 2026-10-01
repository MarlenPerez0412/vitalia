import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SENIOR_DEMO_PROFILE } from '../../../../core/services/senior-mock-data';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { ModuleTileColor, ModuleTileComponent } from '../../../../shared/ui/cards/module-tile.component';
import { VitaliaIconComponent, VitaliaIconName } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorStateService } from '../../services/senior-state.service';

interface HomeModule { title: string; description: string; icon: VitaliaIconName; color: ModuleTileColor; route: string; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, ModuleTileComponent, VitaliaIconComponent],
  selector: 'app-senior-home',
  template: `
    <div class="home">
      <header class="hello">
        <span class="hello__avatar" aria-hidden="true">{{ initials }}</span>
        <div>
          <p class="hello__date">{{ today }}</p>
          <h1>Hola, {{ profile.preferredName }} <span aria-hidden="true">👋</span></h1>
          <p class="hello__status" role="status"><span class="hello__dot" aria-hidden="true"></span>Todo marcha bien</p>
        </div>
      </header>

      <section class="next-med" aria-labelledby="next-medication">
        @if (state.nextMedication(); as medication) {
          <span class="next-med__icon" aria-hidden="true"><app-vitalia-icon name="pill" [size]="30" /></span>
          <div class="next-med__text">
            <p class="next-med__eyebrow" id="next-medication">Próximo medicamento</p>
            <h2>{{ medication.name }}</h2>
            <p><strong>{{ medication.time }}</strong> · {{ medication.dose }}</p>
          </div>
          <app-button icon="check" (pressed)="state.takeMedication(medication.id)">Ya lo tomé</app-button>
        } @else {
          <span class="next-med__icon" aria-hidden="true"><app-vitalia-icon name="check" [size]="30" /></span>
          <div class="next-med__text"><p class="next-med__eyebrow" id="next-medication">Medicamentos de hoy</p><h2>Plan completo</h2><p>Registraste todos tus medicamentos de hoy.</p></div>
        }
      </section>
      @if (state.lastFeedback()) { <div class="senior-page__notice" role="status"><app-vitalia-icon name="check" /><p><strong>Listo</strong><span>{{ state.lastFeedback() }}</span></p></div> }

      <button type="button" class="lia-cta" (click)="go('/senior/lia')">
        <span class="lia-cta__orb" aria-hidden="true"><app-vitalia-icon name="microphone" [size]="34" /></span>
        <span class="lia-cta__text"><strong><span aria-hidden="true">🎙 </span>Hablar con LIA</strong><small>Tu compañera inteligente: pregúntale lo que necesites.</small></span>
        <app-vitalia-icon class="lia-cta__arrow" name="chevron-right" [size]="26" />
      </button>

      <section aria-labelledby="modules-title">
        <h2 id="modules-title" class="section-title">Mis módulos</h2>
        <div class="tiles">
          @for (module of modules; track module.route) {
            <app-module-tile [title]="module.title" [description]="module.description" [icon]="module.icon" [color]="module.color" (opened)="go(module.route)" />
          }
        </div>
      </section>
    </div>
  `,
  styleUrl: './senior-home.component.scss',
})
export class SeniorHomeComponent {
  protected readonly profile = SENIOR_DEMO_PROFILE;
  protected readonly state = inject(SeniorStateService);
  private readonly router = inject(Router);
  protected readonly initials = this.profile.name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('');
  protected readonly today = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  protected readonly modules: readonly HomeModule[] = [
    { title: 'Salud y medicamentos', description: 'Tu plan, horarios y seguimiento.', icon: 'heart', color: 'coral', route: '/senior/health' },
    { title: 'Pensiones y trámites', description: 'Fechas, apoyos e instituciones.', icon: 'wallet', color: 'yellow', route: '/senior/pensions' },
    { title: 'Autocuidado y bienestar', description: 'Mente, cuerpo y emociones.', icon: 'brain', color: 'lilac', route: '/senior/wellbeing' },
    { title: 'Seguridad y ubicación', description: 'Tu red y tu ubicación, con tu permiso.', icon: 'shield', color: 'green', route: '/senior/security' },
    { title: 'Entretenimiento', description: 'Películas, música y actividades.', icon: 'play', color: 'blue', route: '/senior/entertainment' },
    { title: 'Familia', description: 'Llama o escribe a tu red de apoyo.', icon: 'users', color: 'turquoise', route: '/senior/family' },
  ];
  protected go(path: string): void { void this.router.navigateByUrl(path); }
}

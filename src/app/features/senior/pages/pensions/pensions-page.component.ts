import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { VitaliaIconComponent, VitaliaIconName } from '../../../../shared/ui/icon/vitalia-icon.component';

interface PensionHubCard {
  readonly title: string;
  readonly description: string;
  readonly detail: string;
  readonly icon: VitaliaIconName;
  readonly route: string;
  readonly featured?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VitaliaIconComponent],
  selector: 'app-pensions-page',
  template: `
    <section class="pensions-home" aria-labelledby="pensions-title">
      <header class="pensions-header">
        <p class="eyebrow">Información útil</p>
        <h1 id="pensions-title">Pensiones y trámites</h1>
        <p>Organiza tus pagos, citas, trámites y recordatorios importantes.</p>
        <span class="demo-note">Referencias de demostración, sin conexión con instituciones.</span>
      </header>

      <div class="pensions-grid">
        @for (card of cards; track card.route) {
          <button type="button" class="pension-card" [class.pension-card--featured]="card.featured" (click)="open(card.route)">
            <span class="card-icon"><app-vitalia-icon [name]="card.icon" [size]="28" /></span>
            <span class="card-copy"><strong>{{ card.title }}</strong><span>{{ card.description }}</span><small>{{ card.detail }}</small></span>
            <app-vitalia-icon class="card-arrow" name="chevron-right" [size]="22" />
          </button>
        }
      </div>
    </section>
  `,
  styleUrl: './pensions-page.component.scss',
})
export class PensionsPageComponent {
  private readonly router = inject(Router);

  protected readonly cards: readonly PensionHubCard[] = [
    { title: 'Calendario general', description: 'Ver todos tus eventos programados.', detail: '10 categorías disponibles', icon: 'activity', route: '/senior/pensions/calendar', featured: true },
    { title: 'Pensión Bienestar', description: 'Consulta periodos, depósitos y avisos.', detail: 'Próximo periodo: nov-dic · 2 eventos', icon: 'wallet', route: '/senior/pensions/pension' },
    { title: 'IMSS', description: 'Organiza citas, estudios y vigencia.', detail: '2 próximos: cita y estudios', icon: 'heart', route: '/senior/pensions/imss' },
    { title: 'ISSSTE', description: 'Da seguimiento a tus trámites.', detail: '2 trámites próximos', icon: 'clipboard', route: '/senior/pensions/issste' },
    { title: 'SAT', description: 'Reúne recordatorios y documentos fiscales.', detail: '2 recordatorios pendientes', icon: 'clipboard', route: '/senior/pensions/sat' },
    { title: 'Historial de depósitos', description: 'Consulta tus movimientos simulados.', detail: 'Movimientos simulados', icon: 'chart', route: '/senior/pensions/deposits' },
  ];

  protected open(route: string): void { void this.router.navigateByUrl(route); }
}

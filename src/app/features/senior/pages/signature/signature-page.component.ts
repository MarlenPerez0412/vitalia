import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SIGNATURE_METRICS } from '../../../../core/services/senior-mock-data';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SeniorPageComponent, StatusBadgeComponent],
  selector: 'app-signature-page',
  template: `
    <app-senior-page eyebrow="Tu rutina personal" title="Firma VITALIA" description="Una mirada a tus hábitos, comparada contigo misma." backPath="/senior/wellbeing">
      <div class="comparison"><strong>Comparado con tu propia rutina habitual.</strong><p>No te comparamos con otras personas.</p></div>
      <div class="metrics">
        @for (metric of metrics; track metric.label) {
          <article><div class="metric-top"><h2>{{ metric.label }}</h2><app-status-badge [variant]="metric.tone">{{ metric.value }}%</app-status-badge></div><div class="bar" [attr.aria-label]="metric.label + ': ' + metric.value + '%'" role="meter" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="metric.value"><span [style.width.%]="metric.value"></span></div><p>{{ metric.detail }}</p></article>
        }
      </div>
      <p class="disclaimer">Firma VITALIA resume señales de esta demostración y no es una evaluación médica.</p>
    </app-senior-page>
  `,
  styleUrl: './signature-page.component.scss',
})
export class SignaturePageComponent { protected readonly metrics = SIGNATURE_METRICS; }

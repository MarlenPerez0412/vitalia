import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MetricCardComponent } from '../../../../shared/ui/cards/metric-card.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { VitaliaInsightsService } from '../../services/vitalia-insights.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetricCardComponent, SeniorPageComponent, StatusBadgeComponent],
  selector: 'app-vitalia-index-page',
  template: `
    <app-senior-page eyebrow="Resumen personal" title="Índice VITALIA" description="Una referencia sencilla construida con tus hábitos autorizados." backPath="/senior/health">
      <div class="score"><div><strong>{{ insights.index() }}</strong><span>/ 100</span></div><app-status-badge [variant]="insights.index() >= 70 ? 'success' : 'attention'">{{ insights.index() >= 70 ? 'ESTABLE' : 'ATENCIÓN' }}</app-status-badge><p>Resultado calculado con tus medicamentos, actividades, check-ins, cognición e interacción.</p></div>
      <div class="senior-page__grid">@for (metric of insights.metrics(); track metric.label) { <app-metric-card [label]="metric.label" [value]="metric.value + '%'" [detail]="metric.detail" [icon]="metric.label === 'Medicamentos' ? 'pill' : metric.label === 'Cognición' ? 'brain' : metric.label === 'Bienestar' ? 'heart' : 'activity'" /> }</div>
      <div class="senior-page__notice senior-page__notice--warning"><p><strong>No es un diagnóstico.</strong><span>Este índice orientativo no sustituye la valoración de un profesional de salud.</span></p></div>
    </app-senior-page>
  `,
  styles: `
    .score { align-items: center; background: linear-gradient(145deg, var(--color-primary-soft), var(--color-secondary-soft)); border: 1px solid var(--color-border); border-radius: var(--radius-xl); display: flex; flex-wrap: wrap; gap: var(--space-4); padding: clamp(1.25rem, 4vw, 2rem); }
    .score > div { align-items: baseline; display: flex; }.score strong { font-size: clamp(3rem, 9vw, 5.5rem); line-height: .9; }.score span { color: var(--color-text-muted); font-size: 1.25rem; }.score p { color: var(--color-text-muted); flex: 1 1 18rem; margin: 0; }
  `,
})
export class VitaliaIndexPageComponent { protected readonly insights = inject(VitaliaInsightsService); }

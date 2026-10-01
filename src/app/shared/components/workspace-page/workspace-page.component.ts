import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertCardComponent } from '../../ui/cards/alert-card.component';
import { InsightCardComponent } from '../../ui/cards/insight-card.component';
import { MetricCardComponent } from '../../ui/cards/metric-card.component';
import { SeniorCardComponent } from '../../ui/cards/senior-card.component';
import { VitaliaIconComponent } from '../../ui/icon/vitalia-icon.component';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';
import { ResponsiveTableComponent } from '../../ui/responsive-table/responsive-table.component';
import { WorkspacePageConfig } from './workspace-page.models';

/**
 * Seccion generica de los paneles Care, Health y Admin: se configura desde `data.page` de la ruta (datos mock
 * definidos por cada feature) y reutiliza las piezas del Design System. Las acciones son simuladas.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertCardComponent, InsightCardComponent, MetricCardComponent, PageHeaderComponent, ResponsiveTableComponent, SeniorCardComponent, VitaliaIconComponent],
  selector: 'app-workspace-page',
  template: `
    <section class="workspace-page">
      <app-page-header [eyebrow]="page.eyebrow" [title]="page.title" [description]="page.description" />
      @if (page.notice) { <p class="notice"><app-vitalia-icon name="shield" [size]="20" /><span>{{ page.notice }}</span></p> }
      @if (feedback()) { <p class="notice notice--action" role="status"><app-vitalia-icon name="check" [size]="20" /><span>{{ feedback() }}</span></p> }
      @if (page.metrics?.length) {
        <div class="grid grid--metrics">@for (metric of page.metrics; track metric.label) { <app-metric-card [label]="metric.label" [value]="metric.value" [detail]="metric.detail ?? ''" [icon]="metric.icon ?? 'activity'" [tone]="metric.tone ?? 'primary'" /> }</div>
      }
      @if (page.people?.length) {
        <div class="grid">@for (person of page.people; track person.name) { <app-senior-card [name]="person.name" [summary]="person.summary" [lastContact]="person.lastContact" [wellbeingLabel]="person.wellbeingLabel ?? 'Bien'" [wellbeingTone]="person.wellbeingTone ?? 'success'" (selected)="simulate('Resumen de ' + person.name)" /> }</div>
      }
      @if (page.alerts?.length) {
        <div class="grid">@for (alert of page.alerts; track alert.title) { <app-alert-card [title]="alert.title" [description]="alert.description" [timestamp]="alert.timestamp" [severity]="alert.severity" (reviewed)="simulate('Revisión de «' + alert.title + '»')" /> }</div>
      }
      @for (table of page.tables ?? []; track table.caption) { <app-responsive-table [caption]="table.caption" [columns]="table.columns" [rows]="table.rows" /> }
      @if (page.insights?.length) {
        <div class="grid">@for (insight of page.insights; track insight.title) { <app-insight-card [title]="insight.title" [description]="insight.description" [source]="insight.source ?? 'VITALIA'" [tone]="insight.tone ?? 'primary'" /> }</div>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .workspace-page { display: grid; gap: var(--space-6); min-width: 0; }
    .grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); min-width: 0; }
    .grid--metrics { grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); }
    .notice { align-items: center; background: var(--color-primary-soft); border-radius: var(--radius-lg); color: var(--color-primary-hover); display: flex; font-weight: 700; gap: var(--space-2); margin: 0; padding: var(--space-3) var(--space-4); }
    .notice--action { background: var(--color-success-soft); color: var(--color-success); }
  `,
})
export class WorkspacePageComponent {
  protected readonly page = inject(ActivatedRoute).snapshot.data['page'] as WorkspacePageConfig;
  protected readonly feedback = signal('');
  protected simulate(action: string): void { this.feedback.set(`${action}: acción simulada con datos de demostración.`); }
}

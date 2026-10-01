import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { CardShellComponent, CardTone } from '../card-shell/card-shell.component';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../status-badge/status-badge.component';

export type AlertCardSeverity = 'attention' | 'urgent' | 'emergency';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, CardShellComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-alert-card',
  template: `
    <app-card-shell [tone]="cardTone" [interactive]="true" [loading]="loading()">
      <span cardIcon class="icon"><app-vitalia-icon name="alert" /></span>
      <app-status-badge cardMeta [variant]="badgeTone">{{ severityLabel }}</app-status-badge>
      <div><h3>{{ title() }}</h3><p>{{ description() }}</p><small>{{ timestamp() }}</small></div>
      <div cardActions><app-button variant="ghost" (pressed)="reviewed.emit()">Revisar alerta</app-button></div>
    </app-card-shell>
  `,
  styles: `
    .icon { align-items: center; background: var(--color-alert-soft); border-radius: var(--radius-md); color: var(--color-alert); display: inline-flex; height: 3rem; justify-content: center; width: 3rem; }
    h3 { font-size: var(--font-size-card-title); margin: 0; }
    p { color: var(--color-text-muted); margin: var(--space-2) 0; }
    small { color: var(--color-text-subtle); }
  `,
})
export class AlertCardComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly timestamp = input.required<string>();
  readonly severity = input<AlertCardSeverity>('attention');
  readonly loading = input(false);
  readonly reviewed = output<void>();

  protected get cardTone(): CardTone { return this.severity() === 'attention' ? 'warning' : 'danger'; }
  protected get badgeTone(): StatusBadgeVariant { return this.severity(); }
  protected get severityLabel(): string { return { attention: 'Atención', urgent: 'Urgente', emergency: 'Emergencia' }[this.severity()]; }
}

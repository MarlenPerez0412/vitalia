import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardShellComponent, CardTone } from '../card-shell/card-shell.component';
import { VitaliaIconComponent, VitaliaIconName } from '../icon/vitalia-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardShellComponent, VitaliaIconComponent],
  selector: 'app-metric-card',
  template: `
    <app-card-shell [tone]="tone()" [loading]="loading()">
      <span cardIcon class="icon"><app-vitalia-icon [name]="icon()" /></span>
      <div><p>{{ label() }}</p><strong>{{ value() }}</strong>@if (detail()) { <small>{{ detail() }}</small> }</div>
    </app-card-shell>
  `,
  styles: `
    .icon { color: var(--color-primary); display: inline-flex; }
    p { color: var(--color-text-muted); font-size: var(--font-size-small); font-weight: 700; margin: 0; }
    strong { display: block; font-size: clamp(1.75rem, 1.45rem + 1.2vw, 2.5rem); line-height: 1.1; margin-top: var(--space-2); }
    small { color: var(--color-text-muted); display: block; margin-top: var(--space-2); }
  `,
})
export class MetricCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly detail = input('');
  readonly icon = input<VitaliaIconName>('activity');
  readonly tone = input<CardTone>('primary');
  readonly loading = input(false);
}

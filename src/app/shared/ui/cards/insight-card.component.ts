import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardShellComponent, CardTone } from '../card-shell/card-shell.component';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardShellComponent, VitaliaIconComponent],
  selector: 'app-insight-card',
  template: `
    <app-card-shell [tone]="tone()" [loading]="loading()">
      <span cardIcon class="icon"><app-vitalia-icon name="sparkles" /></span>
      <div><p class="source">{{ source() }}</p><h3>{{ title() }}</h3><p>{{ description() }}</p></div>
    </app-card-shell>
  `,
  styles: `
    .icon { align-items: center; background: var(--color-primary-soft); border-radius: var(--radius-md); color: var(--color-primary); display: inline-flex; height: 3rem; justify-content: center; width: 3rem; }
    .source { color: var(--color-primary); font-size: var(--font-size-caption); font-weight: 850; letter-spacing: .06em; margin: 0 0 var(--space-2); text-transform: uppercase; }
    h3 { font-size: var(--font-size-card-title); margin: 0; }
    h3 + p { color: var(--color-text-muted); margin: var(--space-2) 0 0; }
  `,
})
export class InsightCardComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly source = input('VITALIA Prevent');
  readonly tone = input<CardTone>('primary');
  readonly loading = input(false);
}

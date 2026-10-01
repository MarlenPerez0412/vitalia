import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VitaliaIconComponent, VitaliaIconName } from '../icon/vitalia-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VitaliaIconComponent],
  selector: 'app-empty-state',
  template: `<section><span class="icon"><app-vitalia-icon [name]="icon()" [size]="30" /></span><h2>{{ title() }}</h2><p>{{ description() }}</p><div class="action"><ng-content /></div></section>`,
  styleUrl: './state.component.scss',
})
export class EmptyStateComponent {
  readonly title = input('Aún no hay información');
  readonly description = input('Cuando exista contenido aparecerá en este espacio.');
  readonly icon = input<VitaliaIconName>('sparkles');
}

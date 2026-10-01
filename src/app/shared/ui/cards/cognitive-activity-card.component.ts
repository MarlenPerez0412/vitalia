import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { CardShellComponent } from '../card-shell/card-shell.component';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, CardShellComponent, VitaliaIconComponent],
  selector: 'app-cognitive-activity-card',
  template: `
    <app-card-shell tone="secondary" [interactive]="!disabled()" [disabled]="disabled()" [loading]="loading()">
      <span cardIcon class="icon"><app-vitalia-icon name="brain" /></span>
      <div><p class="category">{{ category() }} · {{ durationMinutes() }} min</p><h3>{{ title() }}</h3><p>{{ description() }}</p>
        <div class="progress"><span><span class="sr-only">Progreso: </span>{{ progress() }}%</span><div aria-hidden="true"><i [style.width.%]="progress()"></i></div></div>
      </div>
      <div cardActions><app-button variant="secondary" [disabled]="disabled()" (pressed)="started.emit()">{{ progress() > 0 ? 'Continuar' : 'Comenzar' }}</app-button></div>
    </app-card-shell>
  `,
  styles: `
    .icon { align-items: center; background: var(--color-secondary-soft); border-radius: var(--radius-md); color: var(--color-secondary); display: inline-flex; height: 3rem; justify-content: center; width: 3rem; }
    .category { color: var(--color-secondary); font-size: var(--font-size-caption); font-weight: 850; margin: 0 0 var(--space-2); text-transform: uppercase; }
    h3 { font-size: var(--font-size-card-title); margin: 0; }
    h3 + p { color: var(--color-text-muted); margin: var(--space-2) 0; }
    .progress { align-items: center; display: grid; gap: var(--space-2); grid-template-columns: auto 1fr; margin-top: var(--space-4); }
    .progress > span { color: var(--color-text-muted); font-size: var(--font-size-caption); font-weight: 800; }
    .progress > div { background: var(--color-surface-muted); border-radius: var(--radius-pill); height: .45rem; overflow: hidden; }
    .progress i { background: var(--color-secondary); border-radius: inherit; display: block; height: 100%; }
  `,
})
export class CognitiveActivityCardComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly category = input('Memoria');
  readonly durationMinutes = input(10);
  readonly progress = input(0, { transform: (value: number) => Math.min(100, Math.max(0, value)) });
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly started = output<void>();
}

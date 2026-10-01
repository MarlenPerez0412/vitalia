import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { CardShellComponent, CardTone } from '../card-shell/card-shell.component';
import { VitaliaIconComponent, VitaliaIconName } from '../icon/vitalia-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, CardShellComponent, VitaliaIconComponent],
  selector: 'app-module-card',
  template: `
    <app-card-shell [tone]="tone()" [interactive]="!disabled()" [disabled]="disabled()" [loading]="loading()">
      <span cardIcon class="icon"><app-vitalia-icon [name]="icon()" /></span>
      <div><h3>{{ title() }}</h3><p>{{ description() }}</p></div>
      <div cardActions><app-button variant="ghost" [disabled]="disabled()" (pressed)="opened.emit()">{{ actionLabel() }}<span class="arrow" aria-hidden="true">→</span></app-button></div>
    </app-card-shell>
  `,
  styles: `
    .icon { align-items: center; background: var(--color-primary-soft); border-radius: var(--radius-md); color: var(--color-primary); display: inline-flex; height: 3rem; justify-content: center; width: 3rem; }
    h3 { font-size: var(--font-size-card-title); line-height: var(--line-height-tight); margin: 0; }
    p { color: var(--color-text-muted); margin: var(--space-2) 0 0; }
    .arrow { margin-left: var(--space-1); }
  `,
})
export class ModuleCardComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input<VitaliaIconName>('sparkles');
  readonly tone = input<CardTone>('primary');
  readonly actionLabel = input('Abrir');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly opened = output<void>();
}

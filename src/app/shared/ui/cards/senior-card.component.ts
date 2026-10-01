import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { CardShellComponent } from '../card-shell/card-shell.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../status-badge/status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, CardShellComponent, StatusBadgeComponent],
  selector: 'app-senior-card',
  template: `
    <app-card-shell tone="primary" [interactive]="true" [loading]="loading()">
      <span cardIcon class="avatar" aria-hidden="true">{{ name().charAt(0).toUpperCase() }}</span>
      <app-status-badge cardMeta [variant]="wellbeingTone()">{{ wellbeingLabel() }}</app-status-badge>
      <div><h3>{{ name() }}</h3><p>{{ summary() }}</p><small>Último contacto: {{ lastContact() }}</small></div>
      <div cardActions><app-button variant="primary" (pressed)="selected.emit()">Ver resumen</app-button></div>
    </app-card-shell>
  `,
  styles: `
    .avatar { align-items: center; background: var(--color-primary-soft); border-radius: 50%; color: var(--color-primary); display: inline-flex; font-size: 1.2rem; font-weight: 900; height: 3rem; justify-content: center; width: 3rem; }
    h3 { font-size: var(--font-size-card-title); margin: 0; }
    p { color: var(--color-text-muted); margin: var(--space-2) 0; }
    small { color: var(--color-text-subtle); }
  `,
})
export class SeniorCardComponent {
  readonly name = input.required<string>();
  readonly summary = input.required<string>();
  readonly lastContact = input.required<string>();
  readonly wellbeingLabel = input('Bien');
  readonly wellbeingTone = input<StatusBadgeVariant>('success');
  readonly loading = input(false);
  readonly selected = output<void>();
}

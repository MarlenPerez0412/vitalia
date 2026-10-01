import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { CardShellComponent } from '../card-shell/card-shell.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../status-badge/status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, CardShellComponent, StatusBadgeComponent],
  selector: 'app-user-card',
  template: `
    <app-card-shell [interactive]="true" [loading]="loading()">
      <span cardIcon class="avatar" aria-hidden="true">{{ initials() }}</span>
      <app-status-badge cardMeta [variant]="statusTone()">{{ statusLabel() }}</app-status-badge>
      <div><h3>{{ name() }}</h3><p>{{ email() }}</p><small>{{ roleLabel() }}</small></div>
      <div cardActions><app-button variant="ghost" (pressed)="selected.emit()">Ver perfil</app-button></div>
    </app-card-shell>
  `,
  styles: `
    .avatar { align-items: center; background: linear-gradient(145deg, var(--color-primary), var(--color-secondary)); border-radius: var(--radius-md); color: var(--color-on-primary); display: inline-flex; font-weight: 850; height: 3rem; justify-content: center; width: 3rem; }
    h3 { font-size: var(--font-size-card-title); margin: 0; }
    p { color: var(--color-text-muted); margin: var(--space-1) 0; }
    small { color: var(--color-text-subtle); font-weight: 700; }
  `,
})
export class UserCardComponent {
  readonly name = input.required<string>();
  readonly email = input.required<string>();
  readonly roleLabel = input.required<string>();
  readonly statusLabel = input('Activo');
  readonly statusTone = input<StatusBadgeVariant>('success');
  readonly loading = input(false);
  readonly selected = output<void>();
  protected initials(): string { return this.name().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase(); }
}

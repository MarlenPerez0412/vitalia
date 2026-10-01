import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { CardShellComponent } from '../card-shell/card-shell.component';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../status-badge/status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, CardShellComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-medication-card',
  template: `
    <app-card-shell tone="secondary" [interactive]="true" [loading]="loading()">
      <span cardIcon class="icon"><app-vitalia-icon name="pill" /></span>
      <app-status-badge cardMeta [variant]="statusTone()">{{ statusLabel() }}</app-status-badge>
      <div><p class="eyebrow">Próxima toma · {{ time() }}</p><h3>{{ name() }}</h3><p>{{ dose() }}</p></div>
      <div cardActions>
        <app-button variant="primary" icon="check" [disabled]="disabled()" (pressed)="confirmed.emit()">{{ actionLabel() }}</app-button>
        @if (secondaryActionLabel()) { <app-button variant="ghost" [disabled]="disabled()" (pressed)="postponed.emit()">{{ secondaryActionLabel() }}</app-button> }
      </div>
    </app-card-shell>
  `,
  styles: `
    .icon { align-items: center; background: var(--color-secondary-soft); border-radius: var(--radius-md); color: var(--color-secondary); display: inline-flex; height: 3rem; justify-content: center; width: 3rem; }
    .eyebrow { color: var(--color-secondary); font-size: var(--font-size-caption); font-weight: 850; letter-spacing: .04em; margin: 0 0 var(--space-2); text-transform: uppercase; }
    h3 { font-size: var(--font-size-card-title); margin: 0; }
    div > p:last-child { color: var(--color-text-muted); margin: var(--space-1) 0 0; }
  `,
})
export class MedicationCardComponent {
  readonly name = input.required<string>();
  readonly dose = input.required<string>();
  readonly time = input.required<string>();
  readonly statusLabel = input('Pendiente');
  readonly statusTone = input<StatusBadgeVariant>('pending');
  readonly actionLabel = input('Ya lo tomé');
  readonly secondaryActionLabel = input('');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly confirmed = output<void>();
  readonly postponed = output<void>();
}

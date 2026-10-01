import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VitaliaIconComponent],
  selector: 'app-emergency-button',
  template: `
    <button type="button" [disabled]="disabled() || loading()" [attr.aria-busy]="loading()" (click)="activated.emit()">
      <span class="icon" aria-hidden="true"><app-vitalia-icon name="emergency" [size]="26" /></span>
      <span><strong>{{ loading() ? 'Conectando…' : label() }}</strong><small>{{ helperText() }}</small></span>
    </button>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    button { align-items: center; background: linear-gradient(145deg, var(--color-emergency), var(--color-alert-hover)); border: 0; border-radius: var(--radius-xl); box-shadow: var(--shadow-emergency-sm); color: var(--color-on-primary); cursor: pointer; display: flex; gap: var(--space-3); min-height: 4rem; padding: .65rem 1rem; text-align: left; transition: box-shadow var(--motion-fast), transform var(--motion-fast); width: 100%; }
    button:hover:not(:disabled) { box-shadow: var(--shadow-emergency-md); transform: translateY(-1px); }
    button:active:not(:disabled) { transform: translateY(1px) scale(.99); }
    button:focus-visible { box-shadow: var(--shadow-focus), var(--shadow-emergency-md); outline: 0; }
    button:disabled { cursor: not-allowed; opacity: .55; }
    .icon { align-items: center; background: rgb(255 255 255 / .16); border: 1px solid rgb(255 255 255 / .25); border-radius: 50%; display: inline-flex; flex: 0 0 3rem; height: 3rem; justify-content: center; }
    strong, small { display: block; }
    strong { font-size: 1rem; }
    small { color: rgb(255 255 255 / .86); font-size: var(--font-size-caption); margin-top: .1rem; }
  `,
})
export class EmergencyButtonComponent {
  readonly label = input('Necesito ayuda');
  readonly helperText = input('Contactar a mi red de apoyo');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly activated = output<void>();
}

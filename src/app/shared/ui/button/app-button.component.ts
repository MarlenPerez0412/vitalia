import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { VitaliaIconComponent, VitaliaIconName } from '../icon/vitalia-icon.component';

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'voice' | 'emergency';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VitaliaIconComponent],
  selector: 'app-button',
  template: `
    <button
      [class]="'button button--' + variant()"
      [class.button--block]="block()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading()"
      [attr.type]="type()"
      (click)="pressed.emit()">
      @if (loading()) {
        <span class="spinner" aria-hidden="true"></span><span>{{ loadingLabel() }}</span>
      } @else {
        @if (icon()) { <app-vitalia-icon [name]="icon()!" [size]="20" /> }
        <span><ng-content /></span>
      }
    </button>
  `,
  styleUrl: './app-button.component.scss',
})
export class AppButtonComponent {
  readonly variant = input<AppButtonVariant>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly icon = input<VitaliaIconName>();
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly loadingLabel = input('Procesando');
  readonly block = input(false);
  readonly pressed = output<void>();
}

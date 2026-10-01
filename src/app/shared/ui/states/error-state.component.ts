import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, VitaliaIconComponent],
  selector: 'app-error-state',
  template: `<section role="alert"><span class="icon icon--error"><app-vitalia-icon name="alert" [size]="30" /></span><h2>{{ title() }}</h2><p>{{ description() }}</p><div class="action"><app-button variant="ghost" (pressed)="retry.emit()">Intentar de nuevo</app-button></div></section>`,
  styleUrl: './state.component.scss',
})
export class ErrorStateComponent {
  readonly title = input('No pudimos cargar la información');
  readonly description = input('Revisa tu conexión e inténtalo nuevamente.');
  readonly retry = output<void>();
}

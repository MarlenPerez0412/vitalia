import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NavigationService } from '../../../core/services/navigation.service';
import { AppButtonComponent } from '../button/app-button.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-back-button',
  imports: [AppButtonComponent],
  template: `<app-button variant="ghost" icon="chevron-left" (pressed)="back()">{{ label() }}</app-button>`,
})
export class BackButtonComponent {
  readonly parentRoute = input.required<string>();
  readonly label = input('Volver');
  private readonly navigation = inject(NavigationService);
  protected back(): void { void this.navigation.goTo(this.parentRoute()); }
}

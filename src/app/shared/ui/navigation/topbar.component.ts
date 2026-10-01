import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';
import { NotificationBellComponent } from './notification-bell.component';
import { UserMenuComponent } from './user-menu.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NotificationBellComponent, RouterLink, UserMenuComponent, VitaliaIconComponent],
  selector: 'app-topbar',
  template: `
    <header>
      <div class="leading">
        @if (showMenu()) {
          <button class="icon-button menu" type="button" (click)="menuPressed.emit()" aria-label="Abrir menú de navegación">
            <app-vitalia-icon name="menu" />
          </button>
        }
        <a class="brand" [routerLink]="homePath()" aria-label="VITALIA, ir al inicio"><img src="vitalia-icon.jpg" alt="" aria-hidden="true" class="brand-logo" /><strong>VITALIA</strong></a>
        <div class="context"><strong>{{ title() }}</strong>@if (subtitle()) { <small>{{ subtitle() }}</small> }</div>
      </div>
      <div class="actions">
        <app-notification-bell />
        <app-user-menu />
      </div>
    </header>
  `,
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly homePath = input('/');
  readonly showMenu = input(false);
  readonly menuPressed = output<void>();
}

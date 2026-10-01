import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';
import { NavigationItem } from './navigation.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, VitaliaIconComponent],
  selector: 'app-desktop-sidebar',
  template: `
    <aside [class.collapsed]="collapsed()">
      <div class="brand-row"><a class="brand" [routerLink]="homePath()"><img src="vitalia-icon.jpg" alt="" aria-hidden="true" class="brand-logo" /><strong>VITALIA</strong></a><button type="button" (click)="collapsePressed.emit()" [attr.aria-label]="collapsed() ? 'Expandir navegación' : 'Contraer navegación'"><app-vitalia-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="19" /></button></div>
      <div class="identity"><span aria-hidden="true">{{ displayName().charAt(0).toUpperCase() }}</span><div><strong>{{ displayName() }}</strong><small>{{ sectionName() }}</small></div></div>
      <nav aria-label="Navegación principal">
        @for (item of items(); track item.label) {
          <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" [attr.aria-label]="item.label" [title]="item.label"><app-vitalia-icon [name]="item.icon" [size]="21" /><span>{{ item.label }}</span></a>
        }
      </nav>
      <button class="logout" type="button" (click)="logoutPressed.emit()"><app-vitalia-icon name="logout" [size]="20" /><span>Cerrar sesión</span></button>
    </aside>
  `,
  styleUrl: './desktop-sidebar.component.scss',
})
export class DesktopSidebarComponent {
  readonly sectionName = input.required<string>();
  readonly displayName = input('');
  readonly homePath = input.required<string>();
  readonly items = input.required<readonly NavigationItem[]>();
  readonly collapsed = input(false);
  readonly collapsePressed = output<void>();
  readonly logoutPressed = output<void>();
}

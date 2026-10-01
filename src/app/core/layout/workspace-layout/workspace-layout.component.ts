import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { DesktopSidebarComponent } from '../../../shared/ui/navigation/desktop-sidebar.component';
import { MobileDrawerComponent } from '../../../shared/ui/navigation/mobile-drawer.component';
import { NavigationItem } from '../../../shared/ui/navigation/navigation.models';
import { TopbarComponent } from '../../../shared/ui/navigation/topbar.component';

export type WorkspaceNavItem = NavigationItem;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DesktopSidebarComponent, MobileDrawerComponent, TopbarComponent],
  selector: 'app-workspace-layout',
  template: `
    <div class="workspace-shell" [class.sidebar-collapsed]="sidebarCollapsed()">
      <app-desktop-sidebar
        [sectionName]="sectionName()" [displayName]="auth.currentUser()?.displayName ?? ''"
        [homePath]="homePath()" [items]="navItems()" [collapsed]="sidebarCollapsed()"
        (collapsePressed)="toggleSidebar()" (logoutPressed)="logout()" />
      <div class="workspace-content">
        <app-topbar
          [title]="sectionName()" subtitle="Panel VITALIA"
          [homePath]="homePath()" [showMenu]="true" (menuPressed)="openMenu()" />
        <main><ng-content /></main>
      </div>
      <app-mobile-drawer
        [open]="menuOpen()" [sectionName]="sectionName()" [displayName]="auth.currentUser()?.displayName ?? ''"
        [homePath]="homePath()" [items]="navItems()" (closed)="closeMenu()" (logoutPressed)="logout()" />
    </div>
  `,
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayoutComponent {
  readonly sectionName = input.required<string>();
  readonly homePath = input.required<string>();
  readonly navItems = input.required<readonly WorkspaceNavItem[]>();
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  private readonly router = inject(Router);

  protected openMenu(): void { this.menuOpen.set(true); }
  protected closeMenu(): void { this.menuOpen.set(false); }
  protected toggleSidebar(): void { this.sidebarCollapsed.update((value) => !value); }
  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}

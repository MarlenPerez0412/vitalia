import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkspaceLayoutComponent, WorkspaceNavItem } from './workspace-layout/workspace-layout.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, WorkspaceLayoutComponent],
  selector: 'app-admin-layout',
  template: `<app-workspace-layout sectionName="Administración" homePath="/admin" [navItems]="navItems"><router-outlet /></app-workspace-layout>`,
})
export class AdminLayoutComponent {
  protected readonly navItems: readonly WorkspaceNavItem[] = [
    { label: 'Panel general', path: '/admin', icon: 'home' },
    { label: 'Usuarios', path: '/admin/users', icon: 'users' },
    { label: 'Roles', path: '/admin/roles', icon: 'shield' },
    { label: 'Permisos', path: '/admin/permissions', icon: 'lock' },
    { label: 'Auditoría', path: '/admin/audit', icon: 'clipboard' },
    { label: 'Configuración', path: '/admin/settings', icon: 'settings' },
  ];
}

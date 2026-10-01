import { Routes } from '@angular/router';
import { ADMIN_PAGES } from './admin.pages';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../core/layout/admin-layout.component').then((component) => component.AdminLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/admin-overview.component').then((component) => component.AdminOverviewComponent), title: 'Administración | VITALIA' },
      { path: 'users', loadComponent: () => import('./pages/admin-users.component').then((component) => component.AdminUsersComponent), title: 'Usuarios | VITALIA' },
      { path: 'roles', loadComponent: () => import('./pages/admin-roles.component').then((component) => component.AdminRolesComponent), title: 'Roles | VITALIA' },
      { path: 'permissions', loadComponent: () => import('./pages/admin-permissions.component').then((component) => component.AdminPermissionsComponent), title: 'Permisos | VITALIA' },
      { path: 'audit', loadComponent: () => import('./pages/admin-audit.component').then((component) => component.AdminAuditComponent), title: 'Auditoría | VITALIA' },
      {
        path: 'settings',
        loadComponent: () => import('../../shared/components/workspace-page/workspace-page.component').then((component) => component.WorkspacePageComponent),
        data: { page: ADMIN_PAGES['settings'] },
        title: 'Configuración | VITALIA',
      },
      {
        path: 'profile',
        loadComponent: () => import('../../shared/components/account-page/account-page.component').then((component) => component.AccountPageComponent),
        data: { mode: 'profile' },
        title: 'Mi perfil | VITALIA',
      },
    ],
  },
];

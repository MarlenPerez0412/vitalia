import { Routes } from '@angular/router';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((routes) => routes.AUTH_ROUTES),
  },
  {
    path: 'senior',
    canActivate: [roleGuard],
    data: { roles: ['SENIOR'] },
    loadChildren: () => import('./features/senior/senior.routes').then((routes) => routes.SENIOR_ROUTES),
  },
  {
    path: 'care',
    canActivate: [roleGuard],
    data: { roles: ['CAREGIVER'] },
    loadChildren: () => import('./features/care/care.routes').then((routes) => routes.CARE_ROUTES),
  },
  {
    path: 'health',
    canActivate: [roleGuard],
    data: { roles: ['HEALTH'] },
    loadChildren: () => import('./features/health/health.routes').then((routes) => routes.HEALTH_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },
    loadChildren: () => import('./features/admin/admin.routes').then((routes) => routes.ADMIN_ROUTES),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];

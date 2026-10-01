import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./login.component').then((component) => component.LoginComponent), title: 'Acceso | VITALIA' },
];

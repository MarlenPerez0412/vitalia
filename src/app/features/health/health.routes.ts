import { Routes } from '@angular/router';
import { HEALTH_PAGES } from './health.pages';

const workspacePage = () => import('../../shared/components/workspace-page/workspace-page.component').then((component) => component.WorkspacePageComponent);
const accountPage = () => import('../../shared/components/account-page/account-page.component').then((component) => component.AccountPageComponent);

export const HEALTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../core/layout/health-layout.component').then((component) => component.HealthLayoutComponent),
    children: [
      { path: '', loadComponent: workspacePage, data: { page: HEALTH_PAGES['dashboard'] }, title: 'Salud | VITALIA' },
      { path: 'patients', loadComponent: workspacePage, data: { page: HEALTH_PAGES['patients'] }, title: 'Pacientes | VITALIA' },
      { path: 'follow-up', loadComponent: () => import('./pages/health-follow-up.component').then((component) => component.HealthFollowUpComponent), title: 'Seguimiento | VITALIA' },
      { path: 'medications', loadComponent: workspacePage, data: { page: HEALTH_PAGES['medications'] }, title: 'Medicamentos | VITALIA' },
      { path: 'wellbeing', loadComponent: workspacePage, data: { page: HEALTH_PAGES['wellbeing'] }, title: 'Bienestar | VITALIA' },
      { path: 'cognition', loadComponent: workspacePage, data: { page: HEALTH_PAGES['cognition'] }, title: 'Cognición | VITALIA' },
      { path: 'trends', loadComponent: workspacePage, data: { page: HEALTH_PAGES['trends'] }, title: 'Tendencias | VITALIA' },
      { path: 'alerts', loadComponent: workspacePage, data: { page: HEALTH_PAGES['alerts'] }, title: 'Alertas relevantes | VITALIA' },
      { path: 'reports', loadComponent: workspacePage, data: { page: HEALTH_PAGES['reports'] }, title: 'Reportes | VITALIA' },
      { path: 'history', loadComponent: workspacePage, data: { page: HEALTH_PAGES['history'] }, title: 'Historial | VITALIA' },
      { path: 'profile', loadComponent: accountPage, data: { mode: 'profile' }, title: 'Mi perfil | VITALIA' },
      { path: 'settings', loadComponent: accountPage, data: { mode: 'settings' }, title: 'Configuración | VITALIA' },
    ],
  },
];

import { Routes } from '@angular/router';
import { CARE_PAGES } from './care.pages';

const workspacePage = () => import('../../shared/components/workspace-page/workspace-page.component').then((component) => component.WorkspacePageComponent);
const accountPage = () => import('../../shared/components/account-page/account-page.component').then((component) => component.AccountPageComponent);

export const CARE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../core/layout/care-layout.component').then((component) => component.CareLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/care-dashboard.component').then((component) => component.CareDashboardComponent), title: 'Cuidado | VITALIA' },
      { path: 'people', loadComponent: workspacePage, data: { page: CARE_PAGES['people'] }, title: 'Personas a mi cuidado | VITALIA' },
      { path: 'medications', loadComponent: workspacePage, data: { page: CARE_PAGES['medications'] }, title: 'Medicamentos | VITALIA' },
      { path: 'wellbeing', loadComponent: workspacePage, data: { page: CARE_PAGES['wellbeing'] }, title: 'Bienestar | VITALIA' },
      { path: 'activity', loadComponent: workspacePage, data: { page: CARE_PAGES['activity'] }, title: 'Actividad | VITALIA' },
      { path: 'alerts', loadComponent: workspacePage, data: { page: CARE_PAGES['alerts'] }, title: 'Alertas | VITALIA' },
      { path: 'emergencies', loadComponent: () => import('./pages/care-emergencies.component').then((component) => component.CareEmergenciesComponent), title: 'Emergencias | VITALIA' },
      { path: 'location', loadComponent: () => import('./pages/care-location.component').then((component) => component.CareLocationComponent), title: 'Ubicación autorizada | VITALIA' },
      { path: 'reports', loadComponent: workspacePage, data: { page: CARE_PAGES['reports'] }, title: 'Reportes | VITALIA' },
      { path: 'messages', loadComponent: workspacePage, data: { page: CARE_PAGES['messages'] }, title: 'Mensajes | VITALIA' },
      { path: 'profile', loadComponent: accountPage, data: { mode: 'profile' }, title: 'Mi perfil | VITALIA' },
      { path: 'settings', loadComponent: accountPage, data: { mode: 'settings' }, title: 'Configuración | VITALIA' },
    ],
  },
];

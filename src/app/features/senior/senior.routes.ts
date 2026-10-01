import { Routes } from '@angular/router';

export const SENIOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/senior-shell/senior-shell.component').then((component) => component.SeniorShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/senior-home.component').then((component) => component.SeniorHomeComponent),
        title: 'Mi espacio | VITALIA',
      },
      {
        path: 'lia',
        loadComponent: () => import('./pages/lia/lia-page.component').then((component) => component.LiaPageComponent),
        title: 'LIA | VITALIA',
      },
      {
        path: 'health',
        loadComponent: () => import('./pages/catalog/catalog-page.component').then((component) => component.CatalogPageComponent),
        data: { catalogKey: 'health' },
        title: 'Salud | VITALIA',
      },
      {
        path: 'wellbeing',
        loadComponent: () => import('./pages/catalog/catalog-page.component').then((component) => component.CatalogPageComponent),
        data: { catalogKey: 'wellbeing' },
        title: 'Bienestar | VITALIA',
      },
      {
        path: 'wellbeing/checkin',
        loadComponent: () => import('./pages/checkin/checkin-page.component').then((component) => component.CheckinPageComponent),
        title: 'Check-in diario | VITALIA',
      },
      {
        path: 'security',
        loadComponent: () => import('./pages/catalog/catalog-page.component').then((component) => component.CatalogPageComponent),
        data: { catalogKey: 'security' },
        title: 'Seguridad | VITALIA',
      },
      {
        path: 'pensions',
        loadComponent: () => import('./pages/catalog/catalog-page.component').then((component) => component.CatalogPageComponent),
        data: { catalogKey: 'pensions' },
        title: 'Pensiones y trámites | VITALIA',
      },
      {
        path: 'self-care',
        loadComponent: () => import('./pages/catalog/catalog-page.component').then((component) => component.CatalogPageComponent),
        data: { catalogKey: 'selfCare' },
        title: 'Autocuidado | VITALIA',
      },
      {
        path: 'self-care/memory-demo',
        loadComponent: () => import('./pages/cognitive-activity/cognitive-activity-page.component').then((component) => component.CognitiveActivityPageComponent),
        title: 'Actividad cognitiva | VITALIA',
      },
      {
        path: 'entertainment',
        loadComponent: () => import('./pages/catalog/catalog-page.component').then((component) => component.CatalogPageComponent),
        data: { catalogKey: 'entertainment' },
        title: 'Entretenimiento | VITALIA',
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile-page.component').then((component) => component.ProfilePageComponent),
        title: 'Perfil | VITALIA',
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings-page.component').then((component) => component.SettingsPageComponent),
        title: 'Configuración | VITALIA',
      },
      {
        path: 'medications',
        loadComponent: () => import('./pages/medications/medications-page.component').then((component) => component.MedicationsPageComponent),
        title: 'Medicamentos | VITALIA',
      },
      {
        path: 'medications/history',
        loadComponent: () => import('./pages/medication-history/medication-history-page.component').then((component) => component.MedicationHistoryPageComponent),
        title: 'Historial de medicamentos | VITALIA',
      },
      {
        path: 'signature',
        loadComponent: () => import('./pages/signature/signature-page.component').then((component) => component.SignaturePageComponent),
        title: 'Firma VITALIA | VITALIA',
      },
      {
        path: 'vitalia-index',
        loadComponent: () => import('./pages/vitalia-index/vitalia-index-page.component').then((component) => component.VitaliaIndexPageComponent),
        title: 'Índice VITALIA | VITALIA',
      },
      {
        path: 'prevent',
        loadComponent: () => import('./pages/prevent/prevent-page.component').then((component) => component.PreventPageComponent),
        title: 'VITALIA Prevent | VITALIA',
      },
      {
        path: 'family',
        loadComponent: () => import('./pages/family/family-page.component').then((component) => component.FamilyPageComponent),
        title: 'Familia | VITALIA',
      },
      {
        path: 'emergency',
        loadComponent: () => import('./pages/emergency/emergency-page.component').then((component) => component.EmergencyPageComponent),
        title: 'Emergencia | VITALIA',
      },
      {
        path: 'location',
        loadComponent: () => import('./pages/location/location-page.component').then((component) => component.LocationPageComponent),
        title: 'Ubicación | VITALIA',
      },
      {
        path: 'privacy',
        loadComponent: () => import('./pages/privacy/privacy-page.component').then((component) => component.PrivacyPageComponent),
        title: 'Privacidad | VITALIA',
      },
      {
        path: 'accessibility',
        loadComponent: () => import('./pages/accessibility/accessibility-page.component').then((component) => component.AccessibilityPageComponent),
        title: 'Accesibilidad | VITALIA',
      },
    ],
  },
];

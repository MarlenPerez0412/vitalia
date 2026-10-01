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
        loadComponent: () => import('./pages/pensions/pensions-page.component').then((component) => component.PensionsPageComponent),
        title: 'Pensiones y trámites | VITALIA',
      },
      {
        path: 'pensions/pension',
        loadComponent: () => import('./pages/pensions/pensions-detail-page.component').then((component) => component.PensionsDetailPageComponent),
        data: { pensionView: 'pension' },
        title: 'Pensión Bienestar | VITALIA',
      },
      {
        path: 'pensions/imss',
        loadComponent: () => import('./pages/pensions/pensions-detail-page.component').then((component) => component.PensionsDetailPageComponent),
        data: { pensionView: 'imss' },
        title: 'IMSS | VITALIA',
      },
      {
        path: 'pensions/issste',
        loadComponent: () => import('./pages/pensions/pensions-detail-page.component').then((component) => component.PensionsDetailPageComponent),
        data: { pensionView: 'issste' },
        title: 'ISSSTE | VITALIA',
      },
      {
        path: 'pensions/sat',
        loadComponent: () => import('./pages/pensions/pensions-detail-page.component').then((component) => component.PensionsDetailPageComponent),
        data: { pensionView: 'sat' },
        title: 'SAT | VITALIA',
      },
      {
        path: 'pensions/deposits',
        loadComponent: () => import('./pages/pensions/pensions-detail-page.component').then((component) => component.PensionsDetailPageComponent),
        data: { pensionView: 'deposits' },
        title: 'Historial de depósitos | VITALIA',
      },
      {
        path: 'pensions/calendar',
        loadComponent: () => import('./pages/calendar/calendar-page.component').then((component) => component.CalendarPageComponent),
        title: 'Calendario de pensiones | VITALIA',
      },
      {
        path: 'calendar',
        loadComponent: () => import('./pages/calendar/calendar-page.component').then((component) => component.CalendarPageComponent),
        title: 'Calendario | VITALIA',
      },
      {
        path: 'activities',
        loadComponent: () => import('./pages/habits/habits-page.component').then((component) => component.HabitsPageComponent),
        title: 'Hábitos y actividades | VITALIA',
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
        path: 'self-care/find-different',
        loadComponent: () => import('./pages/find-different/find-different-page.component').then((component) => component.FindDifferentPageComponent),
        title: 'Ejercicios mentales | VITALIA',
      },
      {
        path: 'self-care/whats-next',
        loadComponent: () => import('./pages/whats-next/whats-next-page.component').then((component) => component.WhatsNextPageComponent),
        title: 'Razonamiento | VITALIA',
      },
      {
        path: 'self-care/classify',
        loadComponent: () => import('./pages/classify/classify-page.component').then((component) => component.ClassifyPageComponent),
        title: 'Juegos cognitivos | VITALIA',
      },
      {
        path: 'self-care/move-with-me',
        loadComponent: () => import('./pages/move-with-me/move-with-me-page.component').then((component) => component.MoveWithMePageComponent),
        title: 'Actividad física | VITALIA',
      },
      {
        path: 'self-care/breathe',
        loadComponent: () => import('./pages/breathe/breathe-page.component').then((component) => component.BreathePageComponent),
        title: 'Bienestar emocional | VITALIA',
      },
      {
        path: 'entertainment',
        loadComponent: () => import('./pages/catalog/catalog-page.component').then((component) => component.CatalogPageComponent),
        data: { catalogKey: 'entertainment' },
        title: 'Entretenimiento | VITALIA',
      },
      {
        path: 'entertainment/movies',
        loadComponent: () => import('./entertainment/pages/movies-page.component').then((component) => component.MoviesPageComponent),
        title: 'Películas | VITALIA',
      },
      {
        path: 'entertainment/theater',
        loadComponent: () => import('./entertainment/pages/theater-page.component').then((component) => component.TheaterPageComponent),
        title: 'Teatro | VITALIA',
      },
      {
        path: 'entertainment/news',
        loadComponent: () => import('./entertainment/pages/news-page.component').then((component) => component.NewsPageComponent),
        title: 'Noticias | VITALIA',
      },
      {
        path: 'entertainment/music',
        loadComponent: () => import('./entertainment/pages/music-page.component').then((component) => component.MusicPageComponent),
        title: 'Música | VITALIA',
      },
      {
        path: 'entertainment/crafts',
        loadComponent: () => import('./entertainment/pages/crafts-page.component').then((component) => component.CraftsPageComponent),
        title: 'Manualidades | VITALIA',
      },
      {
        path: 'entertainment/activities',
        loadComponent: () => import('./entertainment/pages/activities-page.component').then((component) => component.ActivitiesPageComponent),
        title: 'Actividades recreativas | VITALIA',
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
        path: 'settings/voice-commands',
        loadComponent: () => import('./pages/voice-commands/voice-commands-page.component').then((component) => component.VoiceCommandsPageComponent),
        title: 'Comandos personalizados | VITALIA',
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

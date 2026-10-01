# Rutas

Cada base usa un layout propio y `roleGuard` (`data.roles`): sin sesión redirige a `/login?returnUrl=…`; con otro rol redirige al inicio de ese rol, así que no se puede entrar a otra área escribiendo la URL. `/login` usa `guestGuard`: con sesión activa redirige al inicio del rol. Tras iniciar sesión, `returnUrl` solo se respeta si pertenece al área del rol.

| Base | Feature lazy | Layout | Estado |
| --- | --- | --- | --- |
| `/login` | auth | — | Login profesional (correo y contraseña) + «Modo demostración» con los 4 roles. |
| `/senior` | senior | `SeniorShellComponent` → `SeniorLayoutComponent` | MVP completo: 23 vistas, comandos de voz globales y aviso de emergencia en curso. |
| `/care` | care | `CareLayoutComponent` → `WorkspaceLayoutComponent` | 11 secciones de menú + configuración. |
| `/health` | health | `HealthLayoutComponent` → `WorkspaceLayoutComponent` | 11 secciones de menú + configuración. |
| `/admin` | admin | `AdminLayoutComponent` → `WorkspaceLayoutComponent` | 6 secciones de menú + perfil. |

`INSTITUTION` existe como rol futuro, sin navegación.

## `/senior` (`src/app/features/senior/senior.routes.ts`)

Menú principal: barra inferior con Inicio, LIA, Salud, Bienestar y **Más**. «Más» abre el drawer con las 10 secciones: Inicio, LIA, Salud, Bienestar, Seguridad, Familia, Pensiones y trámites, Autocuidado, Entretenimiento y Perfil.

| Ruta | Componente | Pantalla |
| --- | --- | --- |
| `/senior` | `SeniorHomeComponent` | Inicio: saludo, estado, próximo medicamento, LIA y 6 módulos |
| `/senior/lia` | `LiaPageComponent` | LIA (texto y voz con Vosk) |
| `/senior/health` | `CatalogPageComponent` (`health`) | Salud: Medicamentos, Historial, Firma, Índice, Prevent |
| `/senior/wellbeing` | `CatalogPageComponent` (`wellbeing`) | Bienestar: Check-in, Cognición, Autocuidado, Firma |
| `/senior/wellbeing/checkin` | `CheckinPageComponent` | Check-in diario |
| `/senior/security` | `CatalogPageComponent` (`security`) | Seguridad: Ubicación, Emergencia, Contactos… |
| `/senior/pensions` | `CatalogPageComponent` (`pensions`) | Pensiones y trámites |
| `/senior/self-care` | `CatalogPageComponent` (`selfCare`) | Autocuidado |
| `/senior/self-care/memory-demo` | `CognitiveActivityPageComponent` | Actividad cognitiva (memoria) |
| `/senior/entertainment` | `CatalogPageComponent` (`entertainment`) | Entretenimiento |
| `/senior/entertainment/movies` | `MoviesPageComponent` | Entretenimiento → Películas; «Volver» navega a `/senior/entertainment` |
| `/senior/entertainment/theater` | `TheaterPageComponent` | Entretenimiento → Teatro; «Volver» navega a `/senior/entertainment` |
| `/senior/entertainment/news` | `NewsPageComponent` | Entretenimiento → Noticias; «Volver» navega a `/senior/entertainment` |
| `/senior/entertainment/music` | `MusicPageComponent` | Entretenimiento → Música; «Volver» navega a `/senior/entertainment` |
| `/senior/entertainment/crafts` | `CraftsPageComponent` | Entretenimiento → Manualidades; «Volver» navega a `/senior/entertainment` |
| `/senior/entertainment/activities` | `ActivitiesPageComponent` | Entretenimiento → Actividades recreativas; «Volver» navega a `/senior/entertainment` |
| `/senior/profile` | `ProfilePageComponent` | Perfil: avatar, nombre, edad y 8 opciones |
| `/senior/settings` | `SettingsPageComponent` | Configuración: comandos de voz, permisos, accesibilidad, privacidad |
| `/senior/medications` | `MedicationsPageComponent` | Medicamentos |
| `/senior/medications/history` | `MedicationHistoryPageComponent` | Historial de medicamentos |
| `/senior/signature` | `SignaturePageComponent` | Firma VITALIA |
| `/senior/vitalia-index` | `VitaliaIndexPageComponent` | Índice VITALIA |
| `/senior/prevent` | `PreventPageComponent` | VITALIA Prevent |
| `/senior/family` | `FamilyPageComponent` | Familia (llamada con `tel:` tras confirmar) |
| `/senior/emergency` | `EmergencyPageComponent` | Emergencia (vista de `EmergencyService`) |
| `/senior/location` | `LocationPageComponent` | Ubicación; `?solicitar=` la pide al llegar (comando «LIA, ¿dónde estoy?») |
| `/senior/privacy` | `PrivacyPageComponent` | Privacidad |
| `/senior/accessibility` | `AccessibilityPageComponent` | Accesibilidad |

`CatalogPageComponent` es una vista genérica impulsada por `data.catalogKey` contra `SENIOR_CATALOGS` (`core/services/senior-mock-data.ts`); cada catálogo define su color de módulo. Los ítems sin `route` propia muestran una acción simulada.

## `/care` (`src/app/features/care/care.routes.ts`)

| Ruta | Componente |
| --- | --- |
| `/care` | `CareDashboardComponent` (resumen + emergencia de María si existe en la sesión) |
| `/care/people`, `/medications`, `/wellbeing`, `/activity`, `/alerts`, `/reports`, `/messages` | `WorkspacePageComponent` + `CARE_PAGES` |
| `/care/emergencies` | `CareEmergenciesComponent` (registro en memoria) |
| `/care/location` | `CareLocationComponent` (solo ubicación compartida en emergencia) |
| `/care/profile`, `/care/settings` | `AccountPageComponent` |

## `/health` (`src/app/features/health/health.routes.ts`)

| Ruta | Componente |
| --- | --- |
| `/health` (Dashboard), `/patients`, `/follow-up`, `/medications`, `/wellbeing`, `/cognition`, `/trends`, `/alerts`, `/reports`, `/history` | `WorkspacePageComponent` + `HEALTH_PAGES` |
| `/health/profile`, `/health/settings` | `AccountPageComponent` |

## `/admin` (`src/app/features/admin/admin.routes.ts`)

| Ruta | Componente |
| --- | --- |
| `/admin` | `AdminOverviewComponent` (Panel general) |
| `/admin/users` | `AdminUsersComponent` (alta, consulta, edición, activación) |
| `/admin/roles` | `AdminRolesComponent` |
| `/admin/permissions` | `AdminPermissionsComponent` (matriz rol × permiso) |
| `/admin/audit` | `AdminAuditComponent` |
| `/admin/settings` | `WorkspacePageComponent` + `ADMIN_PAGES.settings` |
| `/admin/profile` | `AccountPageComponent` |

El menú de usuario (topbar) lleva a `/<rol>/profile` y `/<rol>/settings` y cierra sesión hacia `/login`.

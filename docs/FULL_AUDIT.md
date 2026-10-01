# AUDITORÍA TÉCNICA INTEGRAL: PROYECTO VITALIA
**Fecha:** 2026-10-01  
**Rol:** Principal Software Architect & QA Lead  
**Tipo de Auditoría:** READ-ONLY (Inspección estática, ejecución de suites de pruebas y análisis arquitectónico)  
**Alcance:** Frontend Angular 22, Backend FastAPI/Vosk, Persistencia Mock/localStorage, Accesibilidad WCAG 2.2 AA, Internacionalización y Flujos Demo.

---

## 1. Executive Summary

El proyecto VITALIA presenta una base arquitectónica visual y conceptual de gran calidad para una plataforma HealthTech/AgeTech: diseño visual pulido, tokens CSS accesibles (WCAG 2.2 AA), componentes standalone en Angular 22 con Signals, control de roles (`SENIOR`, `CAREGIVER`, `HEALTH`, `ADMIN`), aislamiento de voz con Vosk en backend y síntesis Web Speech en frontend.

No obstante, **el estado actual del repositorio se encuentra BLOQUEADO para compilación y pruebas** debido a:
1. **21 errores de TypeScript en el Frontend**: Provocados principalmente por una colisión entre dos implementaciones divergentes de la capa multilingüe (esquema ISO `zaa`/`es-MX` vs. esquema piloto `es`/`zapoteco-pilot`/`nahuatl-pilot`) y un error de sintaxis en `signature-page.component.ts` (omisión de llamada a signal en directiva `@for`).
2. **Crash en la recolección de pruebas del Backend (pytest)**: `RuntimeError: Form data requires "python-multipart" to be installed.` al intentar cargar los endpoints de voz en `app/main.py`.
3. **Persistencia Fragmentada**: Coexisten 5 fuentes de verdad independientes en `localStorage` (`vitalia.mock-database.v1`, `vitalia.notifications`, `vitalia.emergencies`, `vitalia.sharing`, `vitalia.follow-ups`), lo que genera pérdida de datos y desincronización entre pestañas.
4. **Caregiver y Health mayoritariamente estáticos**: Mientras que Senior y Admin cuentan con páginas interactivas y servicios dedicados, Caregiver y Health descansan en un 70% sobre `WorkspacePageComponent` con datos hardcodeados y sin contexto dinámico de selección de paciente (`seniorId` / `patientId`).

El progreso real hacia un **MVP MOCK completamente funcional y estable se sitúa en un 54%**.

---

## 2. Build & Test Status

### Frontend (`npm run build`)
- **Estado:** FALLIDO (Código de salida: 1)
- **Causa:** 21 errores de compilación TypeScript emitidos por `@angular/compiler-cli`.
- **Archivos causantes:**
  - `src/app/features/senior/pages/lia/lia-page.component.ts`: 11 errores por tipos incompatibles (`LanguageId` vs `'es-MX'`, `LiaLanguageCode` vs `'zaa'`, propiedades inexistentes `validated`, `isAvailable`, `confidence`, `asrUnavailable`).
  - `src/app/features/senior/pages/signature/signature-page.component.ts`: 1 error (`TS2488`: Signal `metrics` no invocado en `@for (metric of metrics; track metric.label)`).
  - `src/app/features/senior/services/accessibility-preferences.service.ts`: 2 errores (importación de `LanguageSelection` y método inexistente `setPreferred`).
  - `src/app/features/senior/pages/accessibility/accessibility-page.component.ts`: 7 errores (tipos `'es-MX'`, propiedades inexistentes `validationProgress`, `license`, `health()`, interfaces `VoiceProvidersHealth`, `VoiceProviderStatus`).

### Frontend Tests (`npm test -- --watch=false`)
- **Estado:** NO EJECUTABLE (Falla en fase previa de compilación por los 21 errores de TypeScript).
- **Pruebas esperadas:** 38 archivos `.spec.ts` en el workspace (aprox. 287 pruebas unitarias).
- **Pruebas de Entretenimiento:** 6 pruebas en `src/app/features/senior/entertainment/entertainment.spec.ts` (`«Volver» navega a /senior/entertainment sin usar el historial`) fallan estructuralmente debido a que `SeniorPageComponent.goBack()` invoca de manera asíncrona `NavigationService.goTo()` sin que el test espere la resolución de la promesa (`await fixture.whenStable()`).

### Backend Tests (`pytest`)
- **Estado:** FALLIDO en recolección (2 errores durante collection, 0 pruebas ejecutadas).
- **Causa:** `RuntimeError: Form data requires "python-multipart" to be installed.`
- **Detalle:** `backend/app/api/voice.py` declara parámetros `UploadFile` con FastAPI. FastAPI valida la presencia de `python-multipart` al importar las rutas en `app.main:create_app`. Al no estar instalado en el entorno de Python 3.11, ninguna suite de backend (`test_voice.py`, `test_entertainment.py`) puede siquiera recolectarse.

---

## 3. Current Completion % (Matriz de Madurez)

| Área / Módulo | Madurez (%) | Estado Cualitativo |
| :--- | :---: | :--- |
| **Senior Experience** | **72%** | Funcional con huecos (bloqueado por TS en LIA y Firma) |
| **Caregiver Experience** | **38%** | Mayoritariamente UI estática (`WorkspacePageComponent`) |
| **Health Experience** | **32%** | UI estática; sin contexto ni selección de `patientId` |
| **Admin Experience** | **80%** | Completo para MVP mock (CRUD, RBAC, auditoría en memoria/storage) |
| **LIA (Asistente)** | **45%** | Parcialmente funcional; bloqueado por colisión de tipos |
| **Multilingual** | **25%** | Fase piloto experimental; inconsistencia dialectal y 0 validación |
| **Voz (ASR/TTS)** | **65%** | Arquitectura sólida (VAD, Web Audio, Coordinator); bloqueado en backend |
| **Mock Persistence** | **60%** | Funcional pero disperso en múltiples claves de localStorage |
| **Navegación** | **65%** | Guards sólidos; carece de persistencia de queryParams en Care/Health |
| **Notificaciones** | **80%** | Completo para mock (reglas por rol, UI bell, eventos) |
| **OVERALL MVP** | **54%** | **Base sólida pero bloqueada; requiere alineación y unificación** |

---

## 4. Architecture Findings

### Estructura de Carpetas y Modularidad
- La separación `core/`, `shared/`, `features/` es coherente y respeta el principio de dependencias descendentes (`features -> shared/core`).
- `core/layout` mantiene layouts presentacionales con proyección de slots (`SeniorShellComponent`).
- Componentes clave están construidos con Angular standalone y detección de cambios `OnPush`.

### Violaciones y Hallazgos Arquitectónicos
1. **CRÍTICO - Colisión de Refactor Multilingüe:**
   Existen dos paradigmas coexistiendo en el repositorio:
   - *Paradigma A (MMS / ISO 639-3):* Utiliza `'es-MX'`, Zapoteco de la Sierra de Juárez (`'zaa'`), interfaz `ValidatedPhrase`, `PhrasebookService.validationProgress()`.
   - *Paradigma B (Lia Multilingual Intents):* Utiliza `'es'`, `'nahuatl-pilot'`, `'zapoteco-pilot'`, `nativeValidation` booleano y simulación acústica sobre Vosk en `lia-multilingual-intents.ts`.
   Esta disparidad rompió la compilación de `lia-page.component.ts`, `accessibility-page.component.ts` y las specs asociadas.
2. **ALTO - Claves de Almacenamiento Dispersas:**
   En lugar de una única base mock, el estado reside en:
   - `vitalia.mock-database.v1` (MockDatabaseService)
   - `vitalia.notifications` (NotificationService)
   - `vitalia.emergencies` (EmergencyRegistryService)
   - `vitalia.sharing` (SharingConsentService)
   - `vitalia.follow-ups` (HealthFollowUpService)
   - `vitalia.lia-voice` (LiaSpeechService)
   - `vitalia.language` (LanguageContextService)
3. **ALTO - Pérdida de Coordenadas de Emergencia:**
   Para evitar guardar ubicación en el navegador, `EmergencyRegistryService` elimina `latitude` y `longitude` antes de serializar a `vitalia.emergencies`. En consecuencia, al recargar o consultar desde otra pestaña (rol Caregiver), el mapa y el botón "Ver ubicación autorizada" se pierden permanentemente.
4. **MEDIO - Dependencia Asíncrona en Navegación y Pruebas:**
   `NavigationService.goTo()` retorna una `Promise<boolean>`, pero los componentes (`SeniorPageComponent`, `BackButtonComponent`) lo llaman con `void this.navigation.goTo(...)`. En tests unitarios, esto genera condiciones de carrera si no se invoca `whenStable()`.

---

## 5. Data Consistency & Mapa de Datos

### Mapa de Flujo de Datos Actual

```text
[Entidad]                  [Servicio Responsable]       [Almacenamiento]        [Consumidores Principales]
------------------------------------------------------------------------------------------------------------------------
Usuarios/Roles/RBAC        AdminDirectoryService         vitalia.mock-database   Admin (Users, Roles, Perms, Overview), AuthService
Medicamentos (Catálogo)    SeniorStateService            vitalia.mock-database   Senior (Medications, Home, LIA)
Tomas de Medicamento       SeniorStateService            vitalia.mock-database   Senior (Medications, History), VitaliaInsights
Check-ins de Bienestar     SeniorStateService            vitalia.mock-database   Senior (Checkin, Wellbeing), VitaliaInsights
Emergencias (Eventos)      EmergencyRegistryService      vitalia.emergencies     Senior (Emergency), Care (Dashboard, Emergencies)
Consentimientos Red        SharingConsentService         vitalia.sharing         Senior (Privacy), NotificationEventsService
Seguimientos Clínicos      HealthFollowUpService         vitalia.follow-ups      Health (FollowUp), Senior (Calendar sync)
Calendario y Citas         SharedCalendarService         vitalia.mock-database   Senior (Calendar, Pensions, Prevent, Health)
Hábitos y Rutinas          HabitsService                 vitalia.mock-database   Senior (Habits, Home), VitaliaInsights
Notificaciones             NotificationService           vitalia.notifications   Topbar (NotificationBell en todos los roles)
Auditoría                  AdminDirectoryService         vitalia.mock-database   Admin (Audit)
Entretenimiento            EntertainmentService          Mocks JSON locales      Senior (Movies, Music, News, Crafts, etc.)
```

### Inconsistencias Detectadas
- **Duplicidad de Entidades:** `MockDatabaseService` declara colecciones para `emergencies`, `notifications`, `consents` y `healthFollowups`, pero los servicios especializados escriben en sus propias claves de `localStorage`.
- **Datos Hardcodeados:**
  - `CARE_PAGES` y `HEALTH_PAGES` contienen tablas con datos fijos (ej. María Hernández con 73 años, Metformina a las 10:00 AM) que no reaccionan si María marca la toma en `/senior/medications`.
  - `CareDashboardComponent` hardcodea en su template HTML las métricas: `"1 de 4 tomas"` y `"Metformina pendiente"`.
  - `HealthFollowUpComponent` tiene hardcodeado `seniorId: DEMO_SENIOR_ID` (`'usr-senior-demo'`).

---

## 6. Navegación & Rutas

### Resumen de Auditoría de Rutas
- Total de Rutas en la aplicación: **57 rutas declaradas**.
- Acceso por Roles:
  - `/login`: `guestGuard` (redirige al home del rol si ya hay sesión).
  - `/senior/*`: 27 rutas hijas bajo `SeniorShellComponent` protegidas con `roleGuard(['SENIOR'])`.
  - `/care/*`: 12 rutas hijas bajo `CareLayoutComponent` protegidas con `roleGuard(['CAREGIVER'])`.
  - `/health/*`: 12 rutas hijas bajo `HealthLayoutComponent` protegidas con `roleGuard(['HEALTH'])`.
  - `/admin/*`: 6 rutas hijas bajo `AdminLayoutComponent` protegidas con `roleGuard(['ADMIN'])`.

### Divergencias entre Documentación (`ROUTES.md`) y Código
1. `docs/ROUTES.md` afirma: *"/senior: MVP completo: 23 vistas..."*. En el código existen **27 rutas hijas** en `senior.routes.ts`.
2. Las rutas `/senior/calendar`, `/senior/pensions/calendar`, `/senior/activities` y `/senior/settings/voice-commands` existen y están enlazadas en código, pero no están registradas en la tabla principal de `docs/ROUTES.md`.
3. `/health/follow-up` ya no usa `WorkspacePageComponent`, sino su componente dedicado `HealthFollowUpComponent`.

### Deficiencias de Navegación
- **Cero Enrutamiento Parametrizado:** No existen rutas con parámetros de ruta (ej. `/care/people/:id` o `/health/patients/:patientId`).
- **Botón Volver:** Todas las pantallas secundarias usan `SeniorPageComponent[backPath]` o `BackButtonComponent` delegando en `NavigationService.goTo()`. No se detectó uso de `window.history.back()`.

---

## 7. Módulo Senior: Evaluación Funcional

1. **Dashboard (`/senior`):** FUNCIONA. Conectado a `SeniorStateService` y `HabitsService`. Acción directa "Ya lo tomé" y "Realizado".
2. **LIA (`/senior/lia`):** ROTO POR COMPILACIÓN. Estructura completa (texto, voz, sugerencias, feedback), pero impedido por tipos multilingües.
3. **Salud (`/senior/health`):** FUNCIONA. Catálogo navegable hacia medicamentos, historial, firma, índice y prevent.
4. **Medicamentos (`/senior/medications`):** FUNCIONA. Formulario CRUD reactivo, tomas, omisiones y posposiciones conectadas a `MockDatabaseService`.
5. **Historial (`/senior/medications/history`):** FUNCIONA. Reactivo a las tomas y omisiones registradas.
6. **Bienestar (`/senior/wellbeing`):** FUNCIONA. Catálogo con accesos a check-in, cognición y autocuidado.
7. **Check-in (`/senior/wellbeing/checkin`):** FUNCIONA. Wizard en 3 pasos con persistencia y disparo de notificación por malestar.
8. **Seguridad (`/senior/security`):** FUNCIONA. Catálogo hacia ubicación, emergencia y contactos.
9. **Emergencia (`/senior/emergency`):** FUNCIONA. Cuenta regresiva (3s/5s), GPS/demo, registro en `EmergencyRegistryService` y aviso familiar simulado.
10. **Ubicación (`/senior/location`):** FUNCIONA. Integración Leaflet/OSM, solicitud consentida, visualización de precisión y origen demo.
11. **Familia (`/senior/family`):** FUNCIONA. Lista de contactos, diálogo modal de llamada y enlace `tel:`.
12. **Firma VITALIA (`/senior/signature`):** ROTO POR SINTAXIS. Error `@for (metric of metrics)` en template (falta `metrics()`).
13. **Índice VITALIA (`/senior/vitalia-index`):** FUNCIONA. Cálculo dinámico de 0 a 100 basado en hábitos, medicamentos y check-ins.
14. **Prevent (`/senior/prevent`):** FUNCIONA. Identifica cambios en rutina, permite aceptar sugerencia agregándola a `SharedCalendarService`.
15. **Pensiones (`/senior/pensions` y `/pensions/calendar`):** PARCIAL. Catálogo informativo y calendario dedicado.
16. **Calendario (`/senior/calendar`):** FUNCIONA. Vista mensual interactiva, CRUD de eventos, detección de colisiones de horario y sugerencias de horas libres.
17. **Autocuidado (`/senior/self-care`):** PARCIAL. El demo de memoria funciona en UI pero no persiste ni actualiza `CognitiveSession`. Las demás opciones son informativas.
18. **Entretenimiento (`/senior/entertainment` y 6 subpáginas):** FUNCIONA EN UI. 6 secciones con mocks JSON locales y fallback ante error de API.
19. **Perfil (`/senior/profile`):** FUNCIONA. Datos de María y accesos a ajustes.
20. **Configuración (`/senior/settings`):** FUNCIONA. Monitor de permisos de micrófono/GPS y comandos de voz.
21. **Accesibilidad (`/senior/accessibility`):** ROTO POR COMPILACIÓN. Modos visuales implementados pero rotos por tipos multilingües.

---

## 8. Módulo Caregiver: Evaluación Funcional

- **Dashboard (`/care`):** PARCIAL. La tarjeta de emergencia en curso es reactiva y funcional; sin embargo, las métricas de bienestar y medicamentos están hardcodeadas en el template HTML.
- **Emergencias (`/care/emergencies`):** FUNCIONA. Permite "Atender emergencia" y "Resolver emergencia" sincronizando estados con Senior.
- **Ubicación autorizada (`/care/location`):** PARCIAL. Solo funciona si la emergencia se generó en la misma pestaña activa; al recargar o en otra pestaña, las coordenadas no existen en `localStorage`.
- **Secciones Secundarias (`/care/people`, `/medications`, `/wellbeing`, `/activity`, `/alerts`, `/reports`, `/messages`):** SOLO UI. Utilizan `WorkspacePageComponent` con datos estáticos de `care.pages.ts`. Los botones disparan un toast de "acción simulada".
- **Contexto de Senior:** INEXISTENTE. No hay selector de persona a cuidar ni paso de `seniorId` por URL.

---

## 9. Módulo Health: Evaluación Funcional

- **Dashboard y Secciones Clínicas (`/health/dashboard`, `/patients`, `/medications`, `/wellbeing`, `/cognition`, `/trends`, `/alerts`, `/reports`, `/history`):** SOLO UI. Basados en `WorkspacePageComponent` con datos de demostración estáticos.
- **Seguimiento (`/health/follow-up`):** FUNCIONA. Permite crear y editar notas de seguimiento y sincroniza la fecha de próxima revisión con el calendario de María.
- **Contexto de Paciente:** INEXISTENTE. El formulario de seguimiento hardcodea `seniorId: DEMO_SENIOR_ID`. No es posible seleccionar a Rosa Méndez ni a José Pérez para ver o registrar sus datos.

---

## 10. Módulo Admin: Evaluación Funcional

- **Panel General (`/admin`):** FUNCIONA. Métricas calculadas desde `MockDatabaseService`.
- **Usuarios (`/admin/users`):** FUNCIONA. Alta, edición, activación/desactivación y persistencia en `MockDatabaseService`.
- **Roles (`/admin/roles`):** FUNCIONA. Creación y edición de roles. Protección estricta: el rol `ADMIN` no puede desactivarse.
- **Permisos (`/admin/permissions`):** FUNCIONA. Matriz interactiva de 13 permisos × 4 roles. El permiso `MANAGE_PERMISSIONS` de `ADMIN` está bloqueado contra revocación.
- **Auditoría (`/admin/audit`):** FUNCIONA. Lista cronológica de acciones registradas. Cumple estrictamente con ser **READ-ONLY** (sin opciones de edición o borrado).

---

## 11. LIA (Cadena de Asistente)

- **Cadena de Entrada:**
  - Texto → Detección de idioma → `resolveIntent` → Servicios de Dominio (`SeniorStateService`, `EmergencyService`) → Formateo de respuesta → TTS.
- **Cadena de Voz:**
  - Micrófono → `AudioCaptureService` (16 kHz mono) → `VoiceApiService` → FastAPI/Vosk → Transcripción → Detección de intención → Acción → TTS.
- **Estado de Intents Canónicos:**
  - `NEXT_MEDICATION`: Integrado con datos reales.
  - `MEDICATION_TAKEN`: Registra la toma efectiva del medicamento pendiente.
  - `HELP` / `FALL`: Prepara solicitud de ayuda y abre flujo de emergencia.
  - `CALL_DAUGHTER` / `CALL_EMERGENCY_CONTACT`: Resuelve a Ana Hernández y abre modal de llamada `tel:`.
  - `LOCATION`: Consulta `LocationService` y abre mapa.
  - `OPEN_CALENDAR`: Navega a `/senior/calendar`.
  - `CONFIRM` / `CANCEL`: Gestiona confirmación por voz durante cuentas regresivas.
- **Deficiencias Halladas:**
  - En `lia-page.component.ts`, las referencias de interfaz para el reconocedor (`SpeechRecognitionProvider.isAvailable()`, `TranscriptionResult.confidence`) no coinciden con la definición en `speech-recognition.providers.ts`.

---

## 12. Multilingüe: Español, Zapoteco y Náhuatl

### Análisis Crítico de Variantes
1. **Español (es-MX):** **VALIDADO**. Catálogo completo (63+ claves), formateadores de fecha/hora oralizados y voz TTS funcional.
2. **Zapoteco:** **PILOTO NO VALIDADO / CONFLICTO DIALECTAL**.
   - En `language-variants.ts` y `AGENT_LOG.md` se planeó Zapoteco de la Sierra de Juárez (`zaa`, variante Ixtlán/MMS).
   - En `lia-multilingual-intents.ts` se introdujeron frases en Zapoteco del Istmo (`zai`, Diidxazá): *"xi medicina naquiiñeʼ guicaaʼ yaʼ"*, *"caquiiñeʼ gacanécabe naa"*, *"bicaa ridxi xiiñidxaapaʼ"*.
   - Ambas variantes pertenecen a ramas distintas de la familia lingüística zapotecana y no son mutuamente inteligibles.
   - 0% de validación por hablantes nativos.
3. **Náhuatl:** **PILOTO NO VALIDADO**.
   - Frases en `lia-multilingual-intents.ts` (*"tlachke pajtli nijtekiuia?"*, *"moneki nechpaleuisej"*) corresponden aparentemente a Náhuatl de la Huasteca (`nhe`/`ncj`), sin variante dialectal formalmente declarada ni código ISO específico.
   - 0% de validación por hablantes nativos.
4. **Vosk Acústico Simulador (`voskVariants`):**
   - La técnica de mapear transcripciones fonéticas erróneas del modelo español de Vosk (ej. *"once medicina anakin y eggy calla"* para Zapoteco o *"tlaquepaque glynnis de kiwi"* para Náhuatl) es extremadamente frágil, impredecible y no constituye una solución accesible ni digna para hablantes de lenguas originarias. Debe mantenerse estrictamente como prototipo técnico aislado.

---

## 13. Voz (Audio, STT, TTS y Coordinación)

- **AudioCaptureService:** Excelente diseño. Utiliza `MediaRecorder` para LIA y `AudioWorklet` con VAD local (`UtteranceSegmenter`) para comandos continuos. Solo transmite tramos hablados en WAV 16 kHz mono. No almacena audio en disco.
- **VoiceSessionCoordinatorService:** Garantiza exclusión mutua (`IDLE`, `LIA`, `GLOBAL`, `SPEECH`). El micrófono se cierra rigurosamente mientras LIA habla para evitar retroalimentación acústica.
- **LiaSpeechService:** Síntesis nativa `speechSynthesis` priorizando voces mexicanas (Dalia/Sabina/Raúl). Volumen normalizado a máximo 1. Watchdog contra bloqueos.
- **FastAPI / Vosk:** El servicio en `backend/app/services/vosk_service.py` funciona correctamente con rutas Kaldi en Windows, pero está deshabilitado en pruebas por la ausencia de `python-multipart`.
- **FFmpeg:** No instalado en el sistema operativo del usuario. El backend retorna 503 controlado si recibe formatos que requieren transcodificación en servidor; se solventa en frontend convirtiendo a WAV PCM en el navegador con `encodeWav16kMono()`.

---

## 14. Emergencias

- **Convergencia:** El botón SOS, LIA ("Necesito ayuda") y los comandos de voz globales convergen en el único `EmergencyService`.
- **Consentimiento y GPS:** La ubicación nunca se solicita antes de confirmar la solicitud. Si se cancela durante la cuenta regresiva, nunca se activa el GPS.
- **Ciclo de Vida:** `ACTIVE` → `ATTENDED` (por cuidador) → `RESOLVED` (por cuidador) o `CANCELLED`.
- **Veracidad:** No se emiten falsas afirmaciones de contacto con el 911 o servicios públicos. El aviso a familiares es simulado en la demostración.
- **Falla Crítica:** Pérdida de coordenadas en sincronización `storage` entre pestañas.

---

## 15. Medicamentos

- **Fuente de Datos Única:** `SeniorStateService` y `MockDatabaseService` gestionan la lista de medicamentos y tomas (`medications` y `medicationIntakes`).
- **Operaciones:** CRUD completo, toma (`TAKEN`), omisión (`SKIPPED`) y posposición (`postponedUntil`).
- **Integración:** LIA consulta y registra tomas reales.
- **Pendiente:** Caregiver y Health consumen tablas fijas en `care.pages.ts` y `health.pages.ts`, en lugar de consultar `MockDatabaseService`.

---

## 16. Calendario y Hábitos

- **SharedCalendarService:** Servicio centralizado con algoritmo de detección de conflictos horarios (`findConflicts`) y recomendación de slots libres (`suggestTimes`).
- **Fuentes de Eventos:** Manuales, Pensiones (`sourceModule: 'PENSIONS'`), Salud/Seguimiento (`sourceModule: 'HEALTH'`), Prevent (`sourceModule: 'PREVENT'`).
- **HabitsService:** Gestiona actividades diarias por días de la semana y horas de inicio, permitiendo marcar como realizado, posponer 15/60 min u omitir.
- **Integración:** `SeniorHomeComponent` muestra las actividades del día pendientes en tiempo real.

---

## 17. Firma VITALIA, Índice VITALIA y Prevent

- **VitaliaInsightsService:** Los cálculos son dinámicos a partir de la base mock:
  - Adherencia a medicamentos calculada sobre `medicationIntakes`.
  - Actividad calculada sobre `habitCompletions`.
  - Bienestar calculado sobre `wellbeingCheckins`.
  - Cognición calculada sobre `cognitiveSessions`.
- **No Diagnóstico:** Tanto en la Firma como en el Índice y Prevent se incluye la leyenda visible y accesible: *"No es una evaluación médica ni un diagnóstico."*
- **Prevent:** Al detectar menor actividad física, ofrece programar una caminata de 10 min que se inyecta directamente en `SharedCalendarService`.

---

## 18. Notificaciones

- **NotificationService:** Basado en signals, con filtrado por rol y destinatario (`mine()`). Persiste en `vitalia.notifications`.
- **NotificationEventsService:** Desacopla la lógica de negocio; intercepta emergencias, tomas omitidas, cambios en Prevent y eventos de auditoría.
- **Consentimiento de Compartición:** `SharingConsentService` condiciona si los eventos de María llegan o no a Ana (Caregiver) y al Dr. Ruiz (Health).

---

## 19. Autocuidado

- **Secciones en Catálogo:**
  1. Ejercicios mentales: Enlaza a `/senior/self-care/memory-demo`.
  2. Memoria: Enlaza a `/senior/self-care/memory-demo`.
  3. Razonamiento: Solo UI informativa (toast de acción simulada).
  4. Juegos cognitivos: Solo UI informativa.
  5. Actividad física: Solo UI informativa.
  6. Bienestar emocional: Enlaza a `/senior/wellbeing/checkin`.
- **Estado:** `CognitiveActivityPageComponent` es funcional en UI (secuencia de palabras), pero **no guarda resultados** ni añade registros a `MockDatabaseService.cognitiveSessions`.

---

## 20. Entretenimiento

- **Rutas Propias:** 6 rutas hijas bajo `/senior/entertainment/*` (películas, teatro, noticias, música, manualidades, actividades).
- **Consumo:** Endpoints opcionales en FastAPI (`/api/entertainment/*`) con fallback automático y transparente a mocks JSON locales en `src/app/core/mock/entertainment/`.
- **Botón Volver:** Cada pantalla implementa botón volver hacia `/senior/entertainment` sin usar historial.
- **Fallas de Pruebas:** 6 pruebas fallan en `entertainment.spec.ts` debido a falta de sincronización en el test (`await fixture.whenStable()`).

---

## 21. Responsive & Viewports

- Breakpoints auditados: 320 px, 390 px, 768 px, 1024 px, 1440 px y 1920 px.
- **320 px (Mobile mínimo):** Sin overflow horizontal en Home, Medicamentos, Emergencia y LIA. Botones y tarjetas colapsan a una sola columna correctamente.
- **Bottom Navigation:** Senior utiliza `SeniorBottomNavigationComponent` en todos los anchos de pantalla. Aunque no rompe la usabilidad, en viewports `>= 1024 px` deja un espacio desaprovechado al no activar `DesktopSidebarComponent`.
- **Workspaces (Care/Health/Admin):** Implementan drawer móvil en `< 768 px` y sidebar colapsable/expandible en escritorio.

---

## 22. Accesibilidad (WCAG 2.2 AA)

- **Contraste de Color:** Revisado bajo Decisión D012. Paleta ajustada: `--color-primary` (`#0E7A74`), `--color-emergency` (`#C93431`) y fondos suaves cumplen ratio 4.5:1 para texto normal y 3:1 para controles.
- **Touch Targets:** Tokens definen `--touch-target: 3rem` (48 px) para botones, inputs y filas interactivas.
- **Focus Rings:** Visible focus ring definido con `var(--focus-ring)` en todos los elementos interactivos.
- **Reduced Motion:** Media query `@media (prefers-reduced-motion: reduce)` apaga transiciones y animaciones (`0ms`).
- **Semántica:** Uso correcto de `aria-live="polite"` en chat de LIA, `role="alert"` en emergencias y `role="dialog"` con focus trap en `ConsentDialogComponent`.

---

## 23. Seguridad y Privacidad

- **Minimización de Audio:** El audio no se graba en almacenamiento persistente ni en disco. Vive temporalmente en buffers de memoria Web Audio / MediaRecorder.
- **Ubicación:** Solo se activa tras interacción directa del usuario y consentimiento explícito. No hay geolocalización en segundo plano.
- **RBAC en Frontend:** `roleGuard` impide navegación directa por barra de direcciones entre diferentes roles.
- **Vulnerabilidad de Aislamiento Mock:** En un entorno de demostración en el mismo navegador, `localStorage` es compartido por todas las pestañas y sesiones. Un cierre de sesión no purga las claves a menos que se invoque explícitamente `resetDemoData()`.

---

## 24. Fallos en los Flujos Demo

1. **Flujo A (Medicamentos en LIA):** BLOQUEADO por errores de TypeScript en `lia-page.component.ts`. La lógica de dominio subyacente es correcta.
2. **Flujo B (Check-in → Prevent → Calendario):** BLOQUEADO por error de compilación en `signature-page.component.ts`. Funcionalmente, la inserción del evento sugerido en `SharedCalendarService` es exitosa.
3. **Flujo C (Emergencia Senior → Atender en Caregiver):** PARCIALMENTE ROTO. Si Caregiver está en otra pestaña o recarga la página, el botón de ver ubicación en el mapa desaparece porque las coordenadas son eliminadas del `localStorage`.
4. **Flujo D (Health → Seguimiento de Paciente):** PARCIALMENTE ROTO. No existe navegación desde la lista de pacientes hacia el expediente de María; `HealthFollowUpComponent` solo funciona porque tiene el ID de María hardcodeado.
5. **Flujo E (Admin → Usuarios → Auditoría):** FUNCIONA. El registro y la visualización en la tabla de auditoría operan sin fallos.
6. **Flujo F (Multilingüe bidireccional):** COMPLETAMENTE ROTO. Los tipos no compilan y las frases piloto de Zapoteco/Náhuatl no tienen reconocimiento ASR ni síntesis TTS funcional.

---

## 25. Deuda Técnica (Ranking TOP 20)

| N° | Severidad | Archivo(s) | Impacto | Riesgo | Esfuerzo | Recomendación |
| :-: | :--- | :--- | :--- | :--- | :-: | :--- |
| **1** | **CRÍTICO** | `lia-page.component.ts`, `accessibility-page.component.ts`, `language.models.ts` | Bloquea `npm run build` | Alto | M | Alinear interfaces de idiomas, unificar códigos y restaurar propiedades requeridas. |
| **2** | **CRÍTICO** | `signature-page.component.ts` | Error de compilación en template | Bajo | S | Invocar la señal: `@for (metric of metrics(); ...)` |
| **3** | **CRÍTICO** | `backend/requirements.txt`, `backend/app/api/voice.py` | Bloquea `pytest` por falta de `python-multipart` | Alto | S | Instalar `python-multipart` en el entorno virtual de Python. |
| **4** | **ALTO** | `entertainment.spec.ts` | 6 pruebas unitarias fallan por asincronía | Medio | S | Agregar `await fixture.whenStable()` tras el click del botón volver. |
| **5** | **ALTO** | `core/services/*-registry.service.ts`, `mock-database.service.ts` | 5 claves de localStorage fragmentadas | Alto | M | Centralizar toda la persistencia mock dentro de `MockDatabaseService`. |
| **6** | **ALTO** | `emergency-registry.service.ts` | Pérdida de coordenadas en eventos cross-tab | Medio | S | Permitir persistencia de coordenadas demo en `vitalia.emergencies` para pruebas. |
| **7** | **ALTO** | `care-dashboard.component.ts` | Métricas y tarjetas hardcodeadas en HTML | Medio | M | Conectar métricas a `MockDatabaseService` mediante computed signals. |
| **8** | **ALTO** | `health-follow-up.component.ts`, `health.pages.ts` | Falta de contexto `patientId` | Alto | M | Permitir seleccionar paciente y parametrizar la ruta (`/health/patients/:id`). |
| **9** | **ALTO** | `core/i18n/language-variants.ts`, `lia-multilingual-intents.ts` | Confusión dialectal Zapoteco Istmo vs Sierra | Alto | M | Declarar explícitamente la variante piloto (ej. Diidxazá `zai`) y separar del estándar `zaa`. |
| **10** | **MEDIO** | `cognitive-activity-page.component.ts` | Actividad cognitiva no persiste sesión | Medio | S | Guardar resultado en `MockDatabaseService.cognitiveSessions`. |
| **11** | **MEDIO** | `senior-layout.component.ts` | Barra inferior fija en pantallas de escritorio | Bajo | M | Renderizar `DesktopSidebarComponent` en Senior cuando el ancho sea `>= 1024px`. |
| **12** | **MEDIO** | `senior/pages/*` | 15 páginas sin tests unitarios (`.spec.ts`) | Medio | L | Crear suites de prueba unitaria para páginas clave de Senior. |
| **13** | **MEDIO** | Sistema operativo / Host | FFmpeg ausente en máquina local | Bajo | S | Instalar FFmpeg en el host para permitir soporte completo de audio en FastAPI. |
| **14** | **MEDIO** | `backend/app/services/vosk_service.py` | Modelo Vosk de 2.3 GB consume mucha RAM | Bajo | M | Evaluar modelo liviano (`vosk-model-small-es`) para máquinas con poca memoria. |
| **15** | **MEDIO** | Múltiples servicios (`auth`, `lia-speech`, `permissions`) | Acceso directo a `localStorage` sin wrapper | Bajo | S | Reemplazar llamadas nativas por funciones seguras de `storage-sync.ts`. |
| **16** | **BAJO** | `docs/ROUTES.md`, `docs/STATUS.md` | Rutas no documentadas en tablas de resumen | Bajo | S | Actualizar documentación con las 27 rutas reales de Senior. |
| **17** | **BAJO** | `vitalia-insights.service.ts` | Valores de respaldo hardcodeados (75, 78, 80) | Bajo | S | Calcular métricas exclusivamente sobre datos disponibles de la base mock. |
| **18** | **BAJO** | `speech-recognition.providers.ts` | Interfaz incompleta (`isAvailable`, `confidence`) | Medio | S | Implementar stubs de disponibilidad y confianza para el reconocedor. |
| **19** | **BAJO** | `shared/components/workspace-page/` | Acciones en tablas Care/Health solo muestran toast | Bajo | M | Conectar acciones de tabla a rutas hijas o diálogos reales. |
| **20** | **BAJO** | `core/utils/speech-synthesis-voices.debug.ts` | Archivo de debug residual en código productivo | Bajo | S | Eliminar archivo temporal no utilizado. |

---

## 26. Roadmap Priorizado Post-Auditoría

### Fase P0: Desbloqueo Inmediato (Crítico)
- **P0-1:** Reparar los 21 errores de TypeScript en frontend (`signature-page`, `lia-page`, `accessibility-page`).  
  *Responsable:* Claude | *Esfuerzo:* S | *Dependencias:* Ninguna.
- **P0-2:** Instalar `python-multipart` en entorno Python y validar recolección de `pytest`.  
  *Responsable:* Codex / Terminal | *Esfuerzo:* S | *Dependencias:* Ninguna.
- **P0-3:** Corregir las 6 pruebas asíncronas de `entertainment.spec.ts`.  
  *Responsable:* Claude | *Esfuerzo:* S | *Dependencias:* P0-1.
- **P0-4:** Consolidar tipos multilingües en `language.models.ts` para que LIA y Accesibilidad compilen limpiamente.  
  *Responsable:* Claude | *Esfuerzo:* M | *Dependencias:* P0-1.

### Fase P1: Estabilidad del MVP Mock
- **P1-1:** Unificar almacenamiento en `MockDatabaseService` (absorber emergencias, notificaciones y consentimientos).  
  *Responsable:* Gemini | *Esfuerzo:* M | *Dependencias:* P0-1.
- **P1-2:** Implementar selección dinámica de paciente en Caregiver (`/care/people` → contexto `seniorId`).  
  *Responsable:* Claude | *Esfuerzo:* M | *Dependencias:* P1-1.
- **P1-3:** Implementar selección de paciente en Health (`/health/patients` → contexto `patientId`).  
  *Responsable:* Claude | *Esfuerzo:* M | *Dependencias:* P1-1.
- **P1-4:** Dinamizar `CareDashboardComponent` con Signals reactivos desde `MockDatabaseService`.  
  *Responsable:* Claude | *Esfuerzo:* S | *Dependencias:* P1-1.
- **P1-5:** Preservar coordenadas demo en `vitalia.emergencies` para permitir mapa cross-tab.  
  *Responsable:* Claude | *Esfuerzo:* S | *Dependencias:* P1-1.
- **P1-6:** Conectar juego de memoria a `MockDatabaseService.cognitiveSessions`.  
  *Responsable:* Codex | *Esfuerzo:* S | *Dependencias:* P1-1.

### Fase P2: Mejoras de Calidad y Experiencia
- **P2-1:** Habilitar `DesktopSidebarComponent` en `SeniorLayoutComponent` para viewports `>= 1024px`.  
  *Responsable:* Claude | *Esfuerzo:* M | *Dependencias:* P1-2.
- **P2-2:** Añadir pruebas unitarias para las páginas principales de Senior (Checkin, Medications, Location).  
  *Responsable:* Codex | *Esfuerzo:* L | *Dependencias:* P0-1.
- **P2-3:** Crear acción "Restablecer Demostración" (`resetDemoData()`) accesible desde la UI.  
  *Responsable:* Codex | *Esfuerzo:* S | *Dependencias:* P1-1.
- **P2-4:** Corregir y documentar variantes dialectales en los catálogos de Zapoteco y Náhuatl.  
  *Responsable:* Gemini | *Esfuerzo:* M | *Dependencias:* P0-4.

### Fase P3: Post-MVP / Producción
- **P3-1:** Sustituir `MockAuthBackend` por integración real con Supabase Auth y PostgreSQL.  
  *Responsable:* Claude / Gemini | *Esfuerzo:* L | *Dependencias:* Backend real.
- **P3-2:** Modelos ASR/TTS específicos para lenguas originarias con validación de hablantes nativos.  
  *Responsable:* Equipo Clínico/Lingüístico | *Esfuerzo:* L | *Dependencias:* Convenios lingüísticos.
- **P3-3:** Notificaciones Push reales (Web Push / FCM).  
  *Responsable:* Codex | *Esfuerzo:* M | *Dependencias:* Backend real.

---

## 27. Siguiente Tarea Recomendada

**Ejecutar la Tarea P0-1 (Reparación de Tipos y Desbloqueo del Build Frontend):**
Corregir los 21 errores de TypeScript en `src/app/features/senior/pages/signature/signature-page.component.ts`, `src/app/features/senior/pages/lia/lia-page.component.ts`, `src/app/features/senior/pages/accessibility/accessibility-page.component.ts` y alinear `src/app/core/i18n/language.models.ts` para que `npm run build` y `npm test` vuelvan a pasar en verde.

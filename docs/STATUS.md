# Estado

## Completado

- Memoria tecnica inicial y decisiones arquitectonicas.
- Base Angular standalone con SCSS, tokens globales y metadatos PWA.
- Arquitectura `core/shared/features`, rutas lazy, autenticacion mock y guard por rol.
- Layouts base responsive para Senior, Care, Health y Admin.
- Design System reusable con primitives, cards, estados, tabla responsive, formularios e iconografia centralizada.
- Navegacion premium responsive: bottom navigation Senior, sidebar desktop/tablet, drawer movil y topbar.
- Showcase interno no enrutado y revision visual sin overflow en 320, 768, 1100 y 1440 px.
- Pruebas de interaccion para `AppButton`.
- **MVP Senior completo (21 pantallas) y navegable de extremo a extremo**: Login, Senior Home, LIA (simulada), Salud, Medicamentos, Historial de medicamentos, Bienestar, Check-in diario, Firma VITALIA, Indice VITALIA, VITALIA Prevent, Seguridad, Ubicacion (mapa Leaflet + OpenStreetMap con marcador demo), Emergencia (cuenta regresiva, confirmacion, contacto y ubicacion simulados), Pensiones y tramites, Autocuidado (actividad cognitiva), Entretenimiento, Familia, Perfil, Privacidad y Accesibilidad (modos con persistencia local).
- Estado mutable centralizado con signals en `SeniorStateService` (medicamentos, historial, check-ins, eventos de emergencia) y mocks centralizados en `core/services/senior-mock-data.ts`.
- `src/app/features/senior/senior.routes.ts` conecta las 21 rutas bajo `SeniorLayoutComponent` (archivo faltante que bloqueaba toda la seccion `/senior`; ver `docs/AGENT_LOG.md` 2026-09-30).
- Build de produccion y suite de pruebas validados el 2026-09-30.
- Flujo demo completo verificado en navegador real (Playwright) sin errores de consola, en breakpoints 320, 390, 768, 1024 y 1440 px, sin overflow horizontal.
- **Permisos de microfono y ubicacion (2026-09-30)**: `PermissionsService` central (prompt/granted/denied/unavailable/error, con fallback cuando `navigator.permissions` no soporta el permiso), `AudioCaptureService` (MediaRecorder, Blob solo en memoria, libera tracks, se detiene al ocultar la pestana y a los 60 s), `LocationService` integrado (GPS bajo demanda o demo centralizada, sin tracking continuo) y `ConsentDialog` reutilizable y accesible. LIA usa voz real con estados Lista/Solicitando permiso/Escuchando/Detenido/Error y mantiene el texto como alternativa. Ubicacion y Emergencia piden la ubicacion solo tras una accion del usuario (en emergencia, solo despues de confirmar) y muestran mapa con origen, precision y hora. 27 pruebas unitarias.
- **Voz real con FastAPI + Vosk (2026-09-30)**: `backend/` (FastAPI) con `GET /health`, `GET /api/voice/health` y `POST /api/voice/transcribe`, que usa el modelo `backend/models/vosk-model-es-0.42` cargado una sola vez. En LIA: Hablar → Escuchando → Detener → Procesando → texto → `LiaService` (intents NEXT_MEDICATION, MEDICATION_TAKEN, START_CHECKIN, CALL_FAMILY, START_EMERGENCY, OPEN_LOCATION y UNKNOWN) → accion. `VoiceApiService` convierte el audio en el navegador a WAV 16 kHz mono, asi que el flujo funciona sin FFmpeg. Verificado de punta a punta con Vosk real; 44 pruebas frontend y 9 backend.
- **Integración login + roles + voz global + navegación + identidad visual (2026-09-30):**
  - Login profesional (correo/contraseña con `AuthBackend` mock preparado para Supabase) y «Modo demostración» con los 4 roles. `roleGuard` bloquea las URL de otros roles y `guestGuard` protege `/login`.
  - Menús por rol: Senior 10 secciones; Care y Health 11 cada uno; Admin 6.
  - `UserMenu` con perfil, configuración y cierre de sesión.
  - Comandos de voz globales «LIA, …» (`VoiceCommandService` + `VoiceSessionCoordinatorService`, mismo Vosk, VAD local).
  - `EmergencyService` único para botón, LIA y voz; llamadas `tel:` confirmadas con `PhoneService`; contacto principal centralizado.
  - Care muestra la emergencia de María, con ubicación autorizada.
  - Admin con CRUD en memoria de usuarios y roles, matriz rol × permiso y auditoría.
  - Paleta VITALIA AgeTech con ajuste AA; Home, LIA, Emergencia, Perfil y Configuración rediseñados.
  - 111 pruebas frontend y 9 backend.

- **Diagnostico TTS del navegador (2026-09-30):** utilidad temporal y aislada `speech-synthesis-voices.debug.ts` para consultar `speechSynthesis.getVoices()` sin integrarla al flujo de voz de LIA ni modificar la interfaz.
- **Voz de salida de LIA (2026-09-30):**
  - `LiaSpeechService` (`speechSynthesis`): voz Dalia es-MX con respaldo es-MX → es-419 → es-ES → español; cola por prioridad y watchdog.
  - Coordinación con Vosk: micrófono cerrado mientras LIA habla y reanudación de la escucha global solo si estaba activa.
  - Responden por voz:
    - comandos globales (ayuda, me siento mal, me caí, llamadas, ubicación, medicamentos, abrir emergencia, confirmar, cancelar, no entendido);
    - el avance real de la emergencia por voz;
    - el GPS pedido por voz;
    - las respuestas de LIA, que abren la pantalla existente que anuncian.
  - Preferencia «Voz de LIA» en Accesibilidad, guardada en el dispositivo.
  - 159 pruebas frontend (antes 111) y 9 backend. E2E en Edge con Vosk real y micrófono falso.

## En progreso

- Ninguno al cierre de esta etapa.

## Pendiente

- Autenticación real (Supabase Auth) sustituyendo `MockAuthBackend`; persistencia del CRUD de Admin y aplicación efectiva de la matriz de permisos en el backend.
- Voz de LIA: confirmar en el Edge habitual de la persona que se elige Dalia (en el perfil automatizado solo aparecieron Raúl y Sabina es-MX, y se eligió Raúl), y probar el eco con altavoz y micrófono reales (solo se validó con micrófono falso). Valorar si se prefiere una voz femenina dentro de es-MX cuando Dalia no exista.
- Probar los comandos de voz con personas mayores y micrófonos reales en ambientes con ruido (solo se validaron con voz sintética es-MX). Vosk transcribe variantes («abre» → «habrá»); ampliar las variantes con datos reales.
- Persistir y notificar realmente las emergencias a familiares (hoy son simuladas y en memoria; Care solo las ve en la misma sesión).
- Datos reales para Care y Health (hoy mocks por ruta).
- Configurar la URL del backend por entorno (hoy `VOICE_API_BASE_URL` apunta por defecto a `http://localhost:8000`) y servirlo por HTTPS en produccion.
- Probar la voz con personas y microfonos reales: solo se valido con voz sintetica es-MX. Medir memoria (el modelo grande usa varios GB y tarda unos 40 s en cargar); valorar un modelo pequeno para equipos modestos.
- Persistir eventos de emergencia en Supabase cuando corresponda (hoy solo en memoria).
- Servir por HTTPS en produccion: microfono y geolocalizacion requieren contexto seguro.
- Cobertura de pruebas del resto de paginas Senior; ya existen specs de permisos, audio, ubicacion, `ConsentDialog` y emergencia.
- Definir pruebas de aceptacion, estrategia offline y contratos backend definitivos.
- Integrar el resto del backend (datos, autenticacion), IA generativa, notificaciones e integraciones medicas solo en fases autorizadas.

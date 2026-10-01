# Bitácora de agentes

Bitácora acumulativa. No borrar entradas anteriores.

## 2026-09-30 13:15 - Claude

### Objetivo
Retomar el MVP Senior de VITALIA tras una interrupción de la sesión anterior: verificar el estado real del workspace, completar lo que faltaba y dejar el flujo demo navegable sin rutas rotas.

### Archivos modificados
- src/app/features/senior/senior.routes.ts (creado)
- src/app/features/senior/pages/emergency/emergency-page.component.ts
- docs/AGENT_LOG.md (creado)
- docs/STATUS.md
- docs/ROUTES.md
- docs/DECISIONS.md

### Cambios realizados
- Inspección completa del workspace antes de tocar código: se confirmó que las 15 páginas Senior (home, lia, catalog, checkin, cognitive-activity, emergency, family, location, medication-history, medications, prevent, privacy, signature, vitalia-index, accessibility), los servicios con signals (`SeniorStateService`, `LiaService`, `AccessibilityPreferencesService`), los mocks centralizados (`senior-mock-data.ts`) y el mapa Leaflet (`MapComponent`) ya estaban implementados y funcionales, tal como reportó la sesión anterior.
- Se detectó la causa real de la interrupción: `src/app/features/senior/senior.routes.ts` nunca se creó, por lo que `app.routes.ts` apuntaba a un módulo lazy inexistente y toda la sección `/senior` era inalcanzable (build roto). Se reconstruyó este archivo con las 21 rutas hijas bajo `SeniorLayoutComponent`, usando exactamente los paths ya referenciados en el código existente (nav del layout, `SENIOR_CATALOGS`, `backPath` de cada página), sin inventar convenciones nuevas.
- Se corrigió un segundo error de compilación en `emergency-page.component.ts`: el template referenciaba `FAMILY_DEMO` (import a nivel de módulo) directamente, lo cual TypeScript/Angular no permite desde el template; se expuso como `protected readonly familyContact = FAMILY_DEMO`.
- Se validó manualmente el flujo demo completo con un navegador real (Playwright headless) en viewports 320, 390, 768, 1024 y 1440 px: Login → Senior Home → LIA → Salud → Medicamentos (confirmar toma) → Historial → Bienestar → Check-in diario (wizard completo) → Firma VITALIA → Índice VITALIA → Prevent → Emergencia (cuenta regresiva → confirmar → contacto → ubicación → registrado) → Ubicación (mapa Leaflet con tiles OSM y marcador). También se cargaron Seguridad, Pensiones y trámites, Autocuidado (juego de memoria), Entretenimiento, Familia, Perfil, Privacidad y Accesibilidad sin errores.
- No se modificó ninguna página, servicio, modelo ni estilo ya funcional. No se tocaron las áreas Care, Health ni Admin.

### Validaciones
- build: OK (`npm run build`, solo advertencia esperada de CommonJS para `leaflet`).
- tests: OK (`npm test -- --watch=false`, 2 archivos / 5 pruebas, todas en verde; sin suites nuevas para las páginas Senior, que siguen sin cobertura).
- navegación: verificada con navegador real (Playwright) recorriendo las 21 pantallas Senior y el flujo demo completo; cero errores de consola y cero excepciones no capturadas en todo el recorrido.
- responsive: sin overflow horizontal confirmado en 320, 390, 768, 1024 y 1440 px sobre las pantallas clave (home, LIA, medicamentos, emergencia, ubicación, check-in, firma, índice).

### Pendientes
- El `SeniorLayoutComponent` usa `SeniorBottomNavigationComponent` en todos los anchos; `DesktopSidebar` está listado como componente implementado en el Design System pero no está conectado al layout Senior para viewports grandes (no es un error funcional, es una mejora de navegación de escritorio fuera del alcance de esta tarea).
- Cero pruebas unitarias/spec para las 15 páginas y 3 servicios del MVP Senior (LIA, medicamentos, check-in, emergencia, accesibilidad, etc.).
- Varios ítems de catálogo (`security`, `pensions`, `entertainment`) son intencionalmente acciones simuladas sin ruta propia (muestran un aviso "acción simulada"); esto es el comportamiento esperado para el alcance actual del MVP, no un pendiente roto.
- Backend real, Supabase, FastAPI, IA real, Firebase e integraciones médicas siguen sin integrarse, según lo instruido.

## 2026-09-30 14:07 - Claude

### Objetivo
Permisos de micrófono y ubicación

### Archivos modificados
- src/app/core/models/permission.models.ts (creado)
- src/app/core/services/permissions.service.ts (creado) + spec
- src/app/core/services/audio-capture.service.ts (creado) + spec
- src/app/core/services/location.service.ts (reescrito) + spec
- src/app/shared/ui/consent-dialog/consent-dialog.component.ts/.scss (creado) + spec; exportado en `shared/ui/index.ts`
- src/app/shared/components/map/map.component.ts
- src/app/features/senior/components/location-card/location-card.component.ts (creado)
- src/app/features/senior/pages/lia/lia-page.component.ts/.scss
- src/app/features/senior/pages/location/location-page.component.ts
- src/app/features/senior/pages/emergency/emergency-page.component.ts + spec
- src/app/features/senior/models/senior.models.ts
- docs/STATUS.md, docs/DECISIONS.md (D008), docs/DESIGN_SYSTEM.md, docs/AGENT_LOG.md

### Cambios realizados
- Coordinación: otra sesión de Claude (vital-a-24) integraba `LocationService` en Ubicación y Emergencia al mismo tiempo. Acordamos que se detuviera y esta sesión quedó como fuente de verdad. Se conservaron sus aportes útiles (`location.models.ts`, `EmergencyEventDemo`, `recordEmergency(reason, location?)` y el `effect` de `MapComponent`), y el flujo de las páginas se rehízo sobre esa base, ahora con consentimiento.
- `PermissionsService`: estado por permiso (`prompt/granted/denied/unavailable/error`) con signals. `navigator.permissions` se usa solo como pista: si el navegador no lo soporta o no reconoce el permiso (p. ej. `microphone` en Firefox), se conserva el estado conocido y el real se confirma al solicitar. Errores de `getUserMedia` normalizados (`NotAllowedError` → denied; `NotFoundError`/`NotSupportedError` → unavailable). Sin contexto seguro, ambos permisos quedan `unavailable`. En localStorage solo se guarda `vitalia.permission-explained.<tipo>`.
- `AudioCaptureService`: estados `idle/requesting/recording/stopped/error`; MediaRecorder con el mime type soportado. `stop()` devuelve un `AudioRecording` (Blob) solo en memoria y `toTranscriptionForm()` prepara el `FormData` para `POST /api/voice/transcribe`, sin invocarlo. Libera tracks al detener o destruir, se detiene al ocultar la pestaña o a los 60 s y descarta el stream si el usuario cancela durante el permiso. No usa Web Speech API.
- `LocationService`: único uso de `navigator.geolocation` (`enableHighAccuracy`, 10 s, 30 s). Informa el permiso a `PermissionsService`; un timeout no se reporta como denegado. `getDemoPosition()` usa `DEMO_LOCATION` y no finge un permiso concedido. `clear()` olvida la posición.
- `ConsentDialog`: sheet en móvil y modal desde 768 px; `role="dialog"`, `aria-modal`, `aria-labelledby`/`describedby`, focus trap, Escape, retorno de foco y botones de 48 px o más. El input se llama `heading` para no dejar un atributo `title` (tooltip nativo) en el host.
- LIA: «Hablar» comprueba el permiso, muestra el consentimiento mientras el estado sea `prompt`, graba con el indicador «Micrófono activado» y pasa a «Detener». Estados Lista / Solicitando permiso / Escuchando / Detenido / Error. Si el permiso se deniega, no hay dispositivo o falta MediaRecorder, muestra un aviso amigable y mantiene el texto. Se eliminó la transcripción simulada: al detener, LIA indica que la voz aún no se transcribe.
- Ubicación: no pide nada al entrar. «Obtener mi ubicación» → consentimiento → GPS. Si falla, muestra «No pude obtener tu ubicación.» con la causa y la opción [Usar ubicación de demostración]. También permite «Olvidar ubicación». `LocationCard` muestra mapa, origen (GPS real / Ubicación demo), precisión y hora.
- Emergencia: SOS → motivo → cuenta regresiva → confirmar → consentimiento → GPS o demo (también reintentar o continuar sin ubicación) → mapa → contacto familiar → evento mock con la ubicación. Cancelar antes de confirmar nunca solicita ubicación, y un token invalida los resultados tardíos.
- Mapa: círculo de precisión, `invalidateSize` al actualizar la ubicación y `ResizeObserver` solo si existe.

### Validaciones
- build: OK (`npm run build`, solo la advertencia conocida de CommonJS para `leaflet`).
- tests: OK (`npm test -- --watch=false`, 7 archivos / 27 pruebas).
- micrófono (Playwright, Chromium con dispositivo falso): prompt con diálogo, foco y focus trap; «Ahora no» mantiene el texto; rechazado muestra un aviso amigable; concedido pasa a «Escuchando» con el stream activo; detener deja «Detenido» y tracks en `ended`; sin MediaRecorder, error sin abrir el micrófono; sin dispositivo, cubierto en tests unitarios.
- ubicación: nada se solicita al cargar ni al navegar; prompt con diálogo; rechazado → fallback demo; concedido → GPS real con precisión y hora; sin geolocation → fallback; timeout, cubierto en tests unitarios.
- emergencia: cancelar antes de confirmar no llama a geolocation; consentimiento → GPS real → mapa, contacto y registro; rechazado → demo.
- responsive: sin overflow en 320, 390, 768, 1024 y 1440 px; cero errores de consola.

### Pendientes
- conectar AudioCaptureService con FastAPI + Vosk
- persistencia en Supabase cuando corresponda
- servir por HTTPS en producción (micrófono y geolocalización requieren contexto seguro; localhost ya lo es)

## 2026-09-30 14:58 - Claude

### Objetivo
Integración FastAPI + Vosk

### Modelo
`backend/models/vosk-model-es-0.42` (ya descargado, estructura válida: am/, conf/, graph/, ivector/, rescore/, rnnlm/; ~2.3 GB). Configurado como `VOSK_MODEL_PATH=models/vosk-model-es-0.42` en `backend/.env`, relativo a `backend/`. No se descargó ningún modelo.

### Backend creado
- `backend/app/main.py`: `create_app()`, CORS limitado a `CORS_ORIGINS` (por defecto `http://localhost:4200`, solo GET/POST), `GET /health` y carga del modelo en segundo plano al iniciar.
- `backend/app/core/config.py`: `Settings` (pydantic-settings) desde `backend/.env`; rutas relativas a `backend/`.
- `backend/app/services/vosk_service.py`: modelo cargado una vez y reutilizado, validación de estructura, reconocedor por petición y logs solo con duración y número de palabras (nunca el texto). `kaldi_compatible_path()`: en Windows, Kaldi no abre rutas con caracteres no ASCII (`Vitalía`) y fallaba con "Failed to create a model"; se usa la ruta relativa o el nombre corto 8.3.
- `backend/app/services/audio_service.py`: un WAV PCM 16 kHz mono 16 bit se usa tal cual. Otros formatos pasan por FFmpeg (`tempfile` en `backend/temp`, borrado en `finally`); sin FFmpeg devuelve un error controlado con instrucciones de instalación.
- `backend/app/api/voice.py`: `GET /api/voice/health` (`status`, `voskModelLoaded`, `ffmpegAvailable`, `modelName`) y `POST /api/voice/transcribe` (multipart `audio`). Valida presencia (400), MIME (415; webm, wav, x-wav, wave, ogg, mp4), vacío (400), tamaño (413, 10 MB), modelo o FFmpeg no disponibles (503) y audio ilegible (400). Respuesta `{ success, text }`.
- `backend/app/schemas/voice.py`, `requirements.txt` (fastapi, uvicorn, vosk, python-multipart, pydantic-settings), `requirements-dev.txt` (pytest, httpx, necesario para TestClient), `.env.example`, `.gitignore` (excluye .venv, .env, temp y models), `pytest.ini` y `tests/test_voice.py`.

### Frontend modificado
- `core/services/voice-api.service.ts` (nuevo): recibe el `AudioRecording`, construye el `FormData`, llama a `POST {VOICE_API_BASE_URL}/api/voice/transcribe` y devuelve texto o `VoiceApiError` con un mensaje amigable. URL base en el token `VOICE_API_BASE_URL` (por defecto `http://localhost:8000`).
- `core/services/wav-encoder.ts` (nuevo): webm/opus → WAV 16 kHz mono con `OfflineAudioContext`. Si el navegador no puede decodificar, se envía el original y el backend usa FFmpeg.
- `core/services/audio-capture.service.ts`: sin reescribirlo; solo se quitó `toTranscriptionForm()`, porque el formulario ahora lo arma `VoiceApiService` y no se quiere duplicar.
- `app.config.ts`: `provideHttpClient(withFetch())`.
- `features/senior/services/lia.service.ts`: resuelve intents explícitos (`resolveIntent`) sobre texto normalizado sin tildes ni signos, como lo entrega Vosk. Responde con `LiaReply { intent, text, action? }` y los datos reales de `SeniorStateService` (siguiente medicamento). Conserva las respuestas previas de pensión y memoria como `PENSION_INFO` y `MEMORY_ACTIVITY`.
- `features/senior/models/senior.models.ts`: `LiaIntent`, `LiaAction`, `LiaReply`; `LiaMessage` gana `viaVoice` y `action`.
- `features/senior/pages/lia/lia-page.component.ts/.scss`: al detener pasa a «Procesando», transcribe y envía el texto por el mismo camino que un mensaje escrito, marcado «por voz». `MEDICATION_TAKEN` registra el siguiente medicamento pendiente (antes estaba fijado a Metformina por un `includes('tomé')`). Las demás intenciones muestran un botón de acción (Emergencia, Familia, Ubicación, Check-in, Actividad) y nunca inician la emergencia solas. Se eliminó el mensaje «aún no puedo convertir tu voz en texto». Si FastAPI falla: «No pude procesar tu voz. Puedes seguir escribiendo.»; si no se reconoce nada, pide repetir.
- Specs nuevas: `voice-api.service.spec.ts`, `lia.service.spec.ts` y `lia-page.component.spec.ts`.

### Validaciones
- Vosk: el modelo carga en unos 37–40 s. La prueba de integración (`VITALIA_VOSK_IT=1 pytest`) transcribe silencio → `""` y voz sintética es-MX («Qué medicamento me toca») → texto con «medicamento».
- FFmpeg: **no instalado** (`ffmpeg -version` falla); no se descargó, según lo indicado. El backend lo detecta, lo informa en `/api/voice/health` (`ffmpegAvailable: false`) y responde 503 con instrucciones si llega un formato que lo necesita. El flujo de LIA no lo requiere gracias a la conversión WAV del navegador.
- FastAPI: `uvicorn app.main:app` arranca y `/health` responde de inmediato; `/api/voice/health` pasa a `voskModelLoaded: true` cuando termina la carga. CORS: el preflight desde `http://localhost:4200` devuelve 200 y desde otro origen 400. `backend/temp` queda vacío tras las peticiones y los logs no contienen texto transcrito.
- Angular (E2E con Playwright, Chromium con micrófono falso alimentado por WAV de voz sintética es-MX, FastAPI y Vosk reales): «¿Qué medicamento me toca?» → «Te toca Metformina…»; «Ya me tomé mi medicamento» → «registré tu Metformina» con «Acción guardada»; «Necesito ayuda» → botón «Abrir emergencia»; «Quiero hablar con mi hija» → Ana/Familia; «Muéstrame mi ubicación» → botón que navega a Ubicación. Unos 4 s desde Detener hasta la respuesta. Con el backend caído aparece el aviso amigable y el texto sigue disponible. Cero errores de consola. El cambio de estado del medicamento a TAKEN está cubierto en `lia-page.component.spec.ts`.
- build: OK (`npm run build`, solo la advertencia conocida de leaflet).
- tests: frontend OK (`npm test -- --watch=false`, 10 archivos / 44 pruebas); backend OK (`pytest`, 8 pasan y 2 se omiten: FFmpeg ausente e integración con el modelo, que pasa aparte con `VITALIA_VOSK_IT=1`).

### Pendientes
- Instalar FFmpeg para aceptar audio que el navegador no pueda convertir (`winget install Gyan.FFmpeg`).
- Probar con voces y micrófonos reales de personas mayores: solo se validó con voz sintética; la precisión real puede variar.
- El modelo grande usa varios GB de RAM (el equipo tenía ~1.4 GB libres antes de cargarlo); valorar `vosk-model-small-es` para equipos modestos.
- Configurar `VOICE_API_BASE_URL` por entorno y HTTPS en producción.
- Persistencia en Supabase cuando corresponda (sin guardar audio ni transcripciones).
- Nota operativa: el puerto 4200 estaba ocupado por un `ng serve` de otra sesión (mismo workspace); se usó para la prueba sin detenerlo.

## 2026-09-30 18:33 - Claude

### Objetivo
Integración login + roles + voz global + navegación + visual VITALIA

### Conservado
- Vosk, FastAPI, LIA (voz conversacional sin cambios de flujo), permisos, GPS, Leaflet/OSM, fallback demo, `ConsentDialog`, Design System y las 21 vistas Senior.
- `roleGuard` y `UserMenuComponent`, que otra sesión creó alrededor de las 15:00 sin registrarlo; se reutilizó y amplió.
- Coordinación previa con la sesión par vital-a-9d (sin edición simultánea). El workspace no es un repositorio Git, por lo que no hubo commits.
- Servidores del usuario (`ng serve` en 4200 y `uvicorn --reload` en 8000, ya con FFmpeg 9 instalado) usados para el E2E sin detenerlos.

### Login
- `AuthBackend` abstracto con `MockAuthBackend` (`core/auth/auth-backend.ts`) como único punto a sustituir por Supabase Auth.
- `AuthService.signIn(email, password)` (contraseña demo `vitalia2026`), `loginAs(role)` y `redirectFor` (`returnUrl` solo dentro del área del rol).
- `login.component`:
  - lado visual: marca, «Más autonomía, bienestar y seguridad para una vida plena.» y «LIA, tu compañera inteligente.»;
  - formulario: Correo y Contraseña con validación accesible y mostrar/ocultar, «¿Olvidaste tu contraseña?» y errores claros;
  - «Entrar en modo demostración» despliega «MODO DEMOSTRACIÓN» con los 4 roles.
- La cuenta CAREGIVER pasa a ser Ana Hernández, hija y contacto de emergencia de María, para que la historia de la demo sea coherente.

### Roles
- Catálogo RBAC en `core/models/access.models.ts`: 4 roles activos (INSTITUTION queda como futuro), 13 permisos y matriz por defecto.
- `guestGuard` en `/login`. `roleGuard` sin cambios: bloquea por URL y redirige al inicio del rol.

### Navegación
- Senior: barra inferior Inicio, LIA, Salud, Bienestar y «Más», que abre el drawer con 10 secciones.
  - Catálogos: Salud (Medicamentos, Historial, Firma, Índice, Prevent), Bienestar (+Cognición) y Seguridad (+Emergencia, Contactos).
  - Páginas nuevas: `/senior/profile` (avatar, nombre, 73 años y 8 opciones) y `/senior/settings`.
- Care: 11 secciones (Dashboard, Personas, Medicamentos, Bienestar, Actividad, Alertas, Emergencias, Ubicación autorizada, Reportes, Mensajes, Perfil).
- Health: 11 secciones (Dashboard, Pacientes, Seguimiento, Medicamentos, Bienestar, Cognición, Tendencias, Alertas relevantes, Reportes, Historial, Perfil).
- Admin: 6 secciones (Panel general, Usuarios, Roles, Permisos, Auditoría, Configuración).
- Las secciones secundarias usan `WorkspacePageComponent` con datos por ruta; perfil y configuración usan `AccountPageComponent`.
- `UserMenu`: rutas de perfil y configuración por rol, y flechas, Inicio y Fin.
- `MobileDrawer` mueve, atrapa y devuelve el foco; `DesktopSidebar` permite desplazar la lista.
- Se eliminó `FeatureHomeComponent`, un placeholder «Próximamente» que quedó sin uso.

### Voz global
- `AudioCaptureService` añade `startContinuous/stopContinuous`: AudioWorklet (con ScriptProcessor de respaldo), reducción a 16 kHz y `UtteranceSegmenter` (VAD local).
  - Solo los tramos hablados viajan como WAV a `VoiceApiService`, que ya no los reconvierte, y de ahí a FastAPI + el mismo Vosk.
- `global-voice-command.parser.ts` (`GlobalVoiceCommandIntent`): EMERGENCY_HELP, EMERGENCY_SICK, EMERGENCY_FALL, CALL_PRIMARY_CONTACT, CALL_DAUGHTER, OPEN_EMERGENCY, OPEN_LOCATION, NEXT_MEDICATION, CANCEL, CONFIRM, UNKNOWN.
  - Normaliza acentos, mayúsculas y puntuación con `normalizeText`, ahora compartido con LIA.
  - La palabra de activación se calibró con Vosk real («lia», «lía») y se añadieron variantes observadas («abre» → «habrá»).
- `VoiceCommandService`:
  - toggle «Activar comandos de voz» con el consentimiento literal pedido e indicador «🎙 Comandos de voz activos» con [Desactivar];
  - nunca se activa solo y no persiste el estado;
  - lo que no empieza con «LIA» se descarta sin mostrarse; «Sí» y «Cancelar» valen sin «LIA» solo si hay una pregunta pendiente.
- El mínimo de voz del VAD bajó a 150 ms porque «Sí» (~240 ms) se descartaba.

### Coordinación LIA/global
- `VoiceSessionCoordinatorService` (`IDLE | LIA | GLOBAL`): un solo dueño del micrófono.
- LIA llama a `acquireLia` al escuchar (pausa la voz global) y a `releaseLia` al terminar (la reanuda).
- Pestaña oculta: todo se detiene; al volver se reanuda si sigue activo. Logout o salir de Senior: se desactiva y se libera el micrófono.

### Emergencia
- `EmergencyService` (extraído de la página, que pasa a ser vista):
  - BUTTON: cuenta regresiva de 3 s y confirmación explícita, como antes;
  - LIA y GLOBAL_VOICE: «Voy a iniciar la solicitud de ayuda. Puedes cancelar.» y cuenta regresiva de 5 s que avanza sola;
  - «Me siento mal» → [Solicitar ayuda] o «sí» → ubicación directa.
- Cada evento registra tipo (`HELP | SICK | FALL | DIZZY | OTHER`), fuente, contacto y ubicación en `EmergencyRegistryService` (core), que Care consulta.
- `ContactsService` (`primaryEmergencyContact`, `findByRelationship`) y `CONTACTS_DEMO` centralizados; se eliminó `FAMILY_DEMO`.
- `PhoneService` + `CallContactDialog`: «Prepararé una llamada para Ana Hernández.» con [Llamar a Ana] (`tel:+525500000000`, solo al pulsar). En escritorio se muestran nombre, teléfono y «Copiar número».
- Aviso «Solicitud de ayuda en curso» si la persona sale de la pantalla. Nunca se afirma haber contactado servicios reales.

### Diseño
- Paleta VITALIA:
  - tokens `--vitalia-*` exactos;
  - semánticos remapeados tras una auditoría de contraste (primario `#0E7A74`, emergencia `#C93431`, texto atenuado `#566D6A`, borde de input `#7A9491`);
  - colores por módulo y gradiente LIA;
  - `theme-color` y manifest actualizados.
- `ModuleTile` nuevo; `ResponsiveTable` con `cellTemplate`; `ConsentDialog` con contenido proyectado y `tone`; 8 iconos nuevos.
- Home: «Hola, María 👋», «Todo marcha bien», próximo medicamento con [Ya lo tomé], CTA «🎙 Hablar con LIA» y 6 módulos de color.
- LIA: avatar con anillos al escuchar y micrófono circular grande.
- Emergencia: SOS circular, motivos con icono, cuenta regresiva y «También puedes decir: LIA necesito ayuda».
- Perfil y login rediseñados. Budget de estilos por componente: 8/12 kB.
- Layout Senior presentacional con slots y `SeniorShellComponent` en la feature, para que `core` no dependa de `features`.

### Validaciones
- build: OK (solo la advertencia conocida de leaflet).
- tests frontend: OK, 21 archivos / 111 pruebas (antes 44): auth, guards, login, `UserMenu`, parser, VAD, coordinador, `VoiceCommandService`, `EmergencyService`, contactos/teléfono y directorio Admin.
- tests backend: `pytest` 9 pasan y 1 se omite (integración con el modelo, bajo `VITALIA_VOSK_IT=1`).
- E2E de voz global (Playwright + Chromium con micrófono falso alimentado por voz es-MX + FastAPI + Vosk real). Todos los escenarios en verde; la ronda inicial tuvo 3 fallos del script de prueba y una variante de Vosk, corregidos y repetidos:
  - «LIA me siento mal» → «Sí» por voz → GPS → evento registrado (fuente «Comando de voz», Ana avisada de forma simulada, una sola petición de ubicación);
  - «LIA necesito ayuda» → 5…1 → evento;
  - «cancelar» por voz → cancelado sin pedir GPS;
  - «LIA me caí» → evento; tras logout → Care muestra «María Hernández solicitó ayuda: Caída»;
  - «LIA llama a mi hija» y «… a mi contacto de emergencia» → Ana, `tel:` y Copiar número;
  - «LIA abre emergencia», «LIA dónde estoy» (GPS real) y «LIA qué medicamento me toca» (Metformina);
  - frase sin «LIA» descartada;
  - coordinación: LIA pausa la voz global con un solo stream, al terminar se reanuda y Desactivar libera el micrófono.
- E2E de integración:
  - login con credenciales (y error), menú de usuario, Escape, logout y `returnUrl`;
  - los 4 roles con su menú (Senior 10, Care 11, Health 11, Admin 6) y todas las secciones cargando;
  - URL de otro rol bloqueada en los 4 casos;
  - Admin: baja/edición/búsqueda de usuarios, 4 roles, matriz 13×4 con permiso protegido y cambio auditado. Dos verificaciones fallaron por selectores del script (celda ambigua y lectura antes de navegar); el alta y su registro en Auditoría se confirmaron en una ejecución de depuración y en pruebas unitarias;
  - responsive sin overflow en 320, 390, 480, 768, 1024, 1440 y 1920 px, drawer móvil en workspaces y cero errores de consola.

### Pendientes
- Supabase Auth y persistencia del CRUD de Admin; aplicar la matriz de permisos en el backend.
- Probar comandos de voz con personas mayores, acentos, ruido y micrófonos reales (solo voz sintética).
- Notificación real a familiares y persistencia de emergencias (hoy simuladas y en memoria de la sesión).
- Datos reales para Care y Health; HTTPS y `VOICE_API_BASE_URL` por entorno en producción.

## 2026-09-30 20:35 - Claude

### Objetivo
Voz de salida (TTS) para LIA, sin tocar Vosk, FastAPI, comandos, rutas ni diseño.

### Creado
- `core/services/lia-speech.service.ts`:
  - `LiaSpeechService` con `speak/stop/pause/resume`, estados `idle | speaking | paused | error`, `isSpeaking`, `currentMessage`, `voice` y `enabled`;
  - `pickLiaVoice`: Dalia es-MX → es-MX → es-419 → es-ES → español, con `getVoices()` + `voiceschanged`;
  - es-MX, rate 0,9, pitch 1 y volumen 1; prioridades CRITICAL/HIGH/NORMAL/LOW con cola de dos;
  - watchdog si `end` no llega; reintento con otra voz si falla una voz en línea; se calla al ocultar la pestaña.
- Spec `lia-speech.service.spec.ts`, con un `speechSynthesis` simulado.

### Modificado
- `voice-session-coordinator.service.ts`: `speaking`, `beginSpeech/endSpeech`, `registerSpeech`. `pause(reason)` distingue `LIA` y `SPEECH`. `acquireLia` calla a LIA y `requestGlobal` se niega mientras habla.
- `voice-command.service.ts`:
  - frases habladas por comando sin cambiar los textos visibles; nuevo estado `paused-speech`;
  - «sí» durante la cuenta regresiva por voz adelanta la solicitud (LIA lo pregunta tras «Me caí»);
  - `announceCall` al pulsar «Llamar a…»;
  - `startListening` ya no marca error si se pausa mientras arranca.
- `lia.service.ts` + `senior.models.ts`:
  - `LiaReply.speech` (versión hablada) y `LiaReply.opens` (pantalla existente);
  - `spokenMedication/spokenTime` leen el medicamento real («Metformina de 500 miligramos a las 10 de la mañana»).
- `lia-page.component.ts`:
  - habla la respuesta y solo confirma el registro del medicamento si de verdad se guardó;
  - «Sí, te escuché.» a los 1,2 s y «Estoy procesando…» a los 4 s, solo si tarda;
  - conserva el turno del micrófono hasta responder;
  - abre Familia, Check-in, Autocuidado, Pensiones o Ubicación al terminar de hablar. Aclaración del usuario: las pantallas son las que ya existen.
- `emergency.service.ts`:
  - en solicitudes por voz narra «Estoy obteniendo tu ubicación.», «Ubicación obtenida.» o «No pude obtener tu ubicación actual.» y «Tu solicitud de ayuda quedó registrada.»;
  - la cuenta regresiva por voz espera mientras LIA habla; cancelar calla la narración.
- `location-page.component.ts`: con `solicitar`, dice el resultado del GPS. La barra de voz muestra «En pausa mientras LIA habla.».
- `call-contact` en los diálogos de voz: `(called)`. `SeniorShell`: calla a LIA al cerrar sesión.
- Accesibilidad: panel «Voz de LIA» con `senior-page__panel`, `StatusBadge` y un solo `AppButton` que conserva el foco. `AccessibilityPreferencesService.liaVoice/setLiaVoice` delegan en `LiaSpeechService` (`localStorage` `vitalia.lia-voice`).

### Validaciones
- build: OK (solo la advertencia conocida de leaflet).
- tests frontend: 22 archivos / 159 pruebas (antes 111): voz, coordinador, comandos, LIA, página LIA y emergencia. Un `afterEach` comprueba que ninguna frase hablada contiene «LIA» ni afirma avisos o llamadas.
- tests backend: 9 pasan y 1 se omite (integración con el modelo).
- E2E en Edge (Playwright, micrófono falso con WAV de Sabina es-MX, FastAPI + Vosk real):
  - voces es disponibles en el perfil automatizado: Raúl y Sabina (es-MX); se eligió Raúl;
  - eco: Vosk escucha («lía que medicamento me toca») → termina la captura → LIA habla con el micrófono cerrado → 0 transcripciones durante la voz → fin → la escucha global se reabre a ~420 ms. 0 muestras (cada 20 ms) con micrófono y voz a la vez;
  - LIA con «Hablar» y comandos activos: «Sí, te escuché.» + respuesta, sin reabrir el micrófono entre «Detener» y la respuesta;
  - «Quiero llamar a mi familia» escrito → voz → abre `/senior/family`;
  - «LIA, me siento mal» → pregunta → «sí» → «De acuerdo…» → «Ubicación obtenida.» → «Tu solicitud de ayuda quedó registrada.» (evento registrado; «Estoy obteniendo…» se descartó porque el GPS respondió antes);
  - «LIA, llama a mi hija» → «Encontré a Ana Hernández. ¿Quieres llamarla?» → «sí» → indica pulsar → `tel:+525500000000` → «Voy a abrir el marcador…»;
  - «LIA, ¿dónde estoy?» → «Estoy buscando…» → GPS → «Ya encontré tu ubicación…» y mapa;
  - voz desactivada: 0 frases y respuesta visible; preferencia guardada y restaurada;
  - sin overflow en 320, 390, 768 y 1440 px; cero errores de consola.
- La respuesta «sí» del E2E se inyectó como texto transcrito, porque el micrófono falso reinicia su archivo en cada apertura.

### Pendientes
- Comprobar en el Edge habitual que se elige Dalia y probar el eco con altavoz y micrófono reales.
- `speech-synthesis-voices.debug.ts` sigue aislado y sin uso; puede eliminarse.

## 2026-10-01 - Notificaciones funcionales por rol

- Se reemplazó el botón deshabilitado de notificaciones del Topbar por `NotificationBellComponent`, sin cambiar estilos ni iconos globales.
- Se crearon `NotificationService`, `NotificationEventsService`, la semilla `core/mock/notifications.seed.json` y `resolveJsonModule` en `tsconfig.json` (no existe `src/assets`; los estáticos viven en `public/`).
- Se añadió `skipMedication` y el estado `SKIPPED` (sin botón nuevo en la UI) y el id de emergencia ahora incluye sufijo aleatorio para evitar colisiones en el mismo milisegundo.
- Validación: `npm run build` sin errores y 172 pruebas pasando.
- Pendientes: ver `docs/STATUS.md`.

## 2026-10-01 - Notificaciones: sincronización y pendientes

- Sincronización entre pestañas con `storage` y persistencia de emergencias sin coordenadas.
- Nuevos: `SharingConsentService`, `HealthFollowUpService` + `HealthFollowUpComponent` (ruta `/health/follow-up` deja de usar la sección genérica), estado `ATTENDED` y botón en Care, botón «Omitir» en `MedicationCard` (salida opcional `skipped`), aviso por check-in con malestar.
- `emergency.service.spec.ts` limpia `localStorage` al iniciar cada prueba porque el registro ahora persiste.
- Validación: `npm run build` sin errores y 199 pruebas pasando. No se probó en navegador con dos pestañas reales; la sincronización está cubierta con un `StorageEvent` simulado.

## 2026-10-01 00:40 - Claude

### Objetivo
LIA multilingüe bidireccional (es-MX + zapoteco `zaa`, piloto): Fase 1 de 6, núcleo de idiomas.

### Hecho
- Creado en `src/app/core/i18n/`:
  - `language.models.ts`: tipos, `PENDING_VALIDATION`, intenciones canónicas;
  - `language-variants.ts`: es-MX estable y `zaa` piloto, con licencia CC-BY-NC-4.0 y modelos;
  - `catalogs/es-MX.json`: los 63 textos actuales de LIA, idénticos;
  - `catalogs/zaa.json`: las mismas claves, todas `[PENDIENTE_VALIDACION_NATIVA]`, con el texto fuente y marcas de revisión clínica;
  - `language-catalogs.ts`: token para inyectar catálogos de prueba;
  - `language-context.service.ts`: preferencia en `vitalia.language`, interacción de sesión, detección y confianza;
  - `phrasebook.service.ts`: plantillas con datos reales, respaldo español visible, sin inventar texto;
  - `formatters/es-mx.formatters.ts`.
- `lia.service.ts`: usa los formateadores de `core` y los re-exporta, sin cambio de salida.

### Validaciones
- `npm run build`: OK.
- `npm test -- --watch=false`: 29 archivos / 199 pruebas, incluidas las de notificaciones de otra sesión. Hay 3 specs nuevas: catálogos, contexto y plantillas.
- Durante la fase, otra sesión con cambios sin commit (notificaciones) rompió temporalmente el build y una prueba de emergencia. Ambos quedaron en verde al terminar su edición. No toqué sus archivos.

### Pendientes
- Fases 2 a 6.
- Ninguna frase zapoteca está validada.

## 2026-10-01 - Claude (Entretenimiento Senior)

### Objetivo
Dar pantalla propia y contenido funcional a las 6 tarjetas de Entretenimiento sin cambiar el diseño.

### Archivos modificados
- Nuevos: `src/app/features/senior/entertainment/` (servicios, modelos, tarjeta, marco, 6 pantallas, spec), `src/app/core/mock/entertainment/*.json`, `backend/app/api/entertainment.py`, `backend/tests/test_entertainment.py`.
- Editados: `senior.routes.ts` (6 rutas), `core/services/senior-mock-data.ts` (campo `route` de las 6 tarjetas), `backend/app/main.py`, `backend/app/core/config.py`, `backend/requirements.txt`, `backend/.env.example`, docs.

### Cambios realizados
- Pantallas con 4–8 elementos mock, estado de carga, aviso amable ante error y tarjetas expandibles (detalles, materiales y pasos, etc.).
- Fallback: sin clave → mock; error/timeout → mock + aviso. Endpoints FastAPI aislados de `/api/voice`.
- «Volver» reutiliza `SeniorPageComponent[backPath]` (`navigateByUrl`).

### Validaciones
- `npm run build` OK; `npm test -- --watch=false` 247 OK; `pytest` backend 19 OK.

### Pendientes
- Obtener claves TMDB, Ticketmaster, NewsAPI y YouTube y probar los proveedores reales (solo probados con respuestas simuladas).
- Revisión visual en 320–1440 px (el layout reutiliza grid/tokens existentes pero no se capturó en navegador).
- Actividades no combina Ticketmaster todavía (solo catálogo local).

## 2026-10-01 00:50 - Claude

### Objetivo
LIA multilingüe: Fase 2 de 6, el español pasa por la capa de idiomas sin cambios visibles.

### Hecho
- `core/services/lia-output.service.ts` (nuevo) envía cada respuesta según la variante:
  - es-MX: `speak()` síncrono, igual que antes;
  - zapoteco: audio pregrabado validado, luego texto visible con aviso, y voz en español solo si la persona lo permitió;
  - `deliverSpanishNotice` para los avisos del sistema que solo existen en español.
- `core/services/lia-speech.service.ts`: `playClip()` usa la misma cola, prioridades, watchdog (ajustado a la duración real) y bloqueo de micrófono. Libera la URL temporal y conserva el límite de volumen de la otra sesión.
- `features/senior/services/intent-lexicon.ts` (nuevo):
  - el léxico es-MX contiene las regex de `LiaService` y del parser, movidas tal cual;
  - el léxico zapoteco se construye solo con frases validadas y conserva los diacríticos;
  - las intenciones canónicas se traducen a las intenciones existentes (sin lógica paralela por idioma).
- Ahora usan `PhrasebookService` y `LiaOutputService`:
  - `global-voice-command.parser.ts` (opción `lexicon`, por defecto es-MX);
  - `lia.service.ts` (`respondToIntent`, variante de la respuesta; la respuesta de Familia nombra al contacto real);
  - `voice-command.service.ts`, `emergency.service.ts` (solo la narración), `location-page` y `lia-page`.
- `LiaReply` incluye ahora `message` y `spoken` (`LocalizedText`). `VoiceCommandFeedback` incluye `translationPending`.
- Cambio menor: el comando global «¿qué medicamento me toca?» responde directamente a esa intención. Antes una frase como «ya me tomé mi medicamento» podía decir «registré» sin registrar nada.

### Validaciones
- `npm run build`: OK.
- `npm test -- --watch=false`: 33 archivos / 247 pruebas. Las existentes pasan sin cambios.
- Specs nuevas: `intent-lexicon`, `lia-output.service`, `lia-speech-clips` y 2 casos en `lia.service`.

### Pendientes
- Fases 3 a 6.
- Ningún texto zapoteco está validado.

## 2026-10-01 12:00 - Claude

### Objetivo
LIA multilingüe: Fase 3 de 6, modo zapoteco en el frontend (sin modelos).

### Hecho
- Nuevo en `core/i18n/`:
  - `language-detector.ts`, conservador: ≥ 3 palabras, confianza ≥ 0,85, la ñ no cuenta, sin adivinar la variante. Las señales zapotecas son la ortografía del vocabulario MMS `zaa` y las frases validadas.
  - `testing/zaa-test-fixture.ts`, catálogo `[ZAA_TEST]` solo para pruebas.
- Nuevo en `core/services/speech-recognition.providers.ts`:
  - `SpanishVoskProvider`: la misma llamada de siempre.
  - `ZapotecSpeechProvider`: experimental; solo si `/health` lo declara.
  - `SpeechRecognitionRegistry`.
- `voice-api.service.ts`:
  - `health()` lee los proveedores del servidor; un servidor caído o una versión antigua cuentan como no disponible.
  - `transcribeWith()` exige que la respuesta venga de la misma variante, para no aceptar nunca texto de Vosk como zapoteco.
- `language-context.service.ts`: `resolveTextInput()` aplica el orden fijado → contexto → detección → respaldo. Si no puede identificar la variante, pide elegirla.
- `phrasebook.service.ts`: `allIntentPhrases()` y `validationProgress()`. La interpolación ya no duplica el punto final.
- `es-mx.formatters.ts`: `spokenTime()` acepta «10:00 AM», «10:00 a.m.», «10:00 a. m.» y 24 h, porque otra sesión cambió el formato visible de las horas.
- `intent-lexicon.ts`: `languageSwitch()` reconoce «habla en español» y «en zapoteco»; el equivalente zapoteco queda pendiente.
- `lia-page`:
  - insignia del idioma (`StatusBadge`) y botón «Cambiar a español/zapoteco»;
  - nota «Traducción al zapoteco pendiente de validación», indicando si se leyó en español;
  - las preguntas sugeridas son atajos de intención y no cambian el idioma;
  - el texto escrito pasa por la detección;
  - la voz usa el proveedor de la variante, no graba si no está disponible y no actúa con confianza < 0,6;
  - si no hay variante, pide elegirla con la acción «Elegir idioma».
- `voice-command.service` y su barra:
  - proveedor por variante; sin reconocimiento zapoteco, solo comandos en español, con aviso visible;
  - nota de traducción pendiente.
- Accesibilidad: panel «Idioma de VITALIA» con `senior-page__choice-grid`, `StatusBadge`, `AppButton` y `senior-page__detail-list`, sin estilos nuevos. Muestra:
  - Español (México) / Zapoteco;
  - Variante (Sierra de Juárez, piloto) y «Otras variantes: próximamente»;
  - textos validados (0 de 68);
  - respaldo en español (apagado por defecto);
  - estado de la voz y del reconocimiento zapotecos;
  - licencia CC-BY-NC-4.0.
- `public/audio/zapoteco/zaa/README.md`: cómo agregar grabaciones validadas. La carpeta queda vacía.
- Catálogos con 5 claves nuevas, 68 en total.

### Validaciones
- `npm run build`: OK.
- `npm test -- --watch=false`: 281 de 287. Fallan solo 6 pruebas de `entertainment.spec.ts`, trabajo en curso de otra sesión.
- Nuevas specs:
  - detector;
  - `resolveTextInput`;
  - proveedores y `VoiceApiService` por variante;
  - simetría lingüística: es→es, zaa→zaa, pendiente sin voz en español sin permiso, emergencia zaa con GPS y registro, llamada, ubicación, medicamento, continuidad y cambio explícito;
  - idioma en la página de LIA;
  - panel de Accesibilidad.
- Mis specs limpian `localStorage`, porque la base simulada de la otra sesión persiste entre pruebas.

### Pendientes
- Fases 4 a 6.
- Ningún texto zapoteco está validado.

## 2026-10-01 - LIA multilingüe, Fase 4 (redefinida): comandos predeterminados en español, náhuatl piloto y zapoteco piloto

### Objetivo
- Dejar funcionando, con los mocks, tres comandos en tres idiomas: próximo medicamento, pedir ayuda y llamar a la hija.
- Sin ASR nativo, sin TTS nativo y sin cambiar el diseño.

### Cambios
- `core/i18n/lia-multilingual-intents.ts` (nuevo) es el catálogo central.
  - Contiene `canonicalInput`, `aliases`, `responseTemplate`, `confirmationTemplate` y `voskVariants` para cada intención.
  - Las frases náhuatl y zapotecas son las entregadas por el equipo, sin cambios; las zapotecas conservan el saltillo ʼ (U+02BC).
  - Las `voskVariants` se calibraron con voz sintética es-MX contra `vosk-model-es-0.42`.
- `normalize-voice-phrase.ts` y `multilingual-voice-intent-matcher.ts` (nuevos): normalizan y puntúan las frases, con umbral por intención (HELP ≥ 0,9). `evaluateIntent()` es una función pura que comparten el servicio y el léxico por defecto.
- Capa de idiomas:
  - `language.models.ts` y `language-variants.ts` reescritos: `'es' | 'nahuatl-pilot' | 'zapoteco-pilot'`.
  - `language-context.service.ts` reescrito: `liaLanguage`, guardado en `vitalia.lia-language`.
  - `phrasebook.service.ts` reescrito: claves `intent.X.response|confirmation` con respaldo en español; dosis y hora se formatean por idioma.
  - `language-detector.ts`: detecta las frases piloto por el matcher.
  - Se eliminaron `catalogs/zaa.json` y `testing/zaa-test-fixture.ts`; `es-MX.json` quedó con 57 claves.
- Servicios:
  - `speech-recognition.providers.ts`: Vosk para todos; en los pilotos, `vosk-fallback` experimental.
  - `voice-api.service.ts` volvió a la versión de HEAD.
  - `voice-debug-log.service.ts` (nuevo): registro solo en desarrollo.
  - `lia-output.service.ts`: los pilotos se muestran solo en texto; `PilotTtsProvider` queda tras `LIA_EXPERIMENTAL_TTS_ENABLED`, apagado por defecto.
- `intent-lexicon.ts`:
  - nueva intención `CALL_DAUGHTER` en LIA;
  - léxico por idioma (regex en español + catálogo) y `chainFor()`, que prueba primero el piloto y después el español;
  - `SPANISH_LEXICON` por defecto, para que `parseGlobalVoiceCommand(texto)` siga funcionando sin opciones;
  - `ES_MX_LEXICON` sustituido.
- `lia.service.ts`:
  - `resolve()` devuelve intención, idioma y confianza;
  - las respuestas de las tres intenciones salen del catálogo con datos reales;
  - un piloto sin coincidencia recibe «No pude reconocer ese comando…», sin acción.
- `voice-command.service.ts`:
  - analiza con la cadena de léxicos y registra cada frase en el registro de desarrollo;
  - HELP usa la respuesta del catálogo y la cuenta regresiva de siempre;
  - la hija tiene respuesta y confirmación propias;
  - nueva pregunta `MEDICATION`, de 30 s, sin diálogo: «sí» solo explica que hay que pulsar «Ya la tomé»;
  - aviso fijo de reconocimiento experimental en los pilotos.
- `lia-page`:
  - el idioma piloto se indica como «respuestas en texto»;
  - el botón alterna entre el español y el idioma elegido;
  - la nota distingue el respaldo en español de la frase piloto sin validación nativa;
  - «Llamar a Ana» abre `CallContactDialogComponent`;
  - sin bloqueo por falta de ASR.
- Accesibilidad: selector Español / Náhuatl (piloto) / Zapoteco (piloto) con la clase `senior-page__choice-grid` existente, notas de límites y respaldo en español. Se retiraron el estado MMS y la licencia.
- `public/audio/README.md` sustituye a `public/audio/zapoteco/zaa/README.md`.

### Validaciones
- Specs nuevas o reescritas:
  - catálogo;
  - normalizador;
  - matcher: frases canónicas, saltillos, `voskVariants`, HELP con baja confianza;
  - contexto (persistencia);
  - phrasebook: datos dinámicos y respaldo;
  - salida: sin voz española en pilotos, y flag experimental;
  - proveedores, léxico y simetría: los mismos servicios en los tres idiomas;
  - idioma en la página de LIA;
  - Accesibilidad.
- Se ajustaron las specs existentes de LIA y de comandos de voz a los textos en español que pidió el usuario: respuestas de medicamento, ayuda y hija.
- `npm run build`: OK. Antes falló por `signature-page.component.ts`, trabajo de otra sesión: `metrics` había pasado a ser una señal y la plantilla no la llamaba. Se corrigió con un solo cambio: `metrics` → `metrics()`.
- `npm test -- --watch=false`: 354 de 354.
- No hubo cambios en el backend, así que no se ejecutó pytest.

### Pendientes
- Validación nativa de todas las frases piloto. Observaciones a revisar:
  - el zapoteco parece del Istmo y no de la Sierra de Juárez;
  - «abrir el marcador» se tradujo como «papel» (amatl) y «archivo» (archivu);
  - en náhuatl se mezclan ortografías.
- Faltan las confirmaciones en náhuatl y zapoteco (hoy en español con aviso), el «sí» y el «cancelar» piloto, y la voz nativa o los audios validados.
- El reconocimiento por voz en los pilotos depende de cómo Vosk español deforma la frase: hay que calibrarlo con hablantes reales.

## 2026-10-01 - Integración AsistenteVitaliaOffline (Desktop Voice Client) y Roadmap Náhuatl OpenSLR 148

### Objetivo
Integrar el cliente de voz offline `AsistenteVitaliaOffline` (Vosk + PyAudio + pyttsx3) sin romper el proyecto existente, con tolerancia de rutas, compatibilidad Kaldi en Windows y hoja de ruta para soporte nativo de Náhuatl mediante fine-tuning acústico OpenSLR 148.

### Cambios realizados
- `prueba.py` (raíz): Actualizado con la implementación completa de `AsistenteVitaliaOffline`. Incorpora resolución inteligente de rutas para el modelo Vosk (detecta automáticamente `backend/models/vosk-model-es-0.42` o carpetas alternativas) y adaptación de rutas para Kaldi en Windows ante nombres de directorio con acentos (`Vitalía`).
- `backend/scripts/asistente_offline.py`: Sincronizado como módulo oficial del backend con las respuestas contextuales para Salud (medicamento para la presión a las 2 PM, cita en Tehuacán a las 10 AM), Trámites (recibo de luz), Accesibilidad Náhuatl y Wake Word («Vitalia» / «Italia»).
- Documentada la estrategia de evolución futura para STT nativo en Náhuatl: sustitución de Vosk en `escuchar_peticion()` por `faster-whisper` local con fine-tuning sobre el corpus acústico OpenSLR 148 (Náhuatl de Puebla).
- Actualizado `docs/STATUS.md`.

### Validaciones
- Backend tests: `pytest` ejecutado con el entorno virtual (`.venv\Scripts\pytest.exe`), 19 pruebas pasando y 1 omitida (sin regresiones).
- Compilación de Python: `py_compile` en `prueba.py` y `backend/scripts/asistente_offline.py` exitoso (cero errores de sintaxis).
- Frontend build: `npm run build` exitoso (cero errores de TypeScript/routing).
- Frontend tests: `npm test -- --watch=false`, 40 suites / 354 pruebas pasando limpiamente.

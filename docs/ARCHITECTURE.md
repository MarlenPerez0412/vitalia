# Arquitectura

- Frontend: Angular 22+, TypeScript y SCSS; componentes standalone y deteccion de cambios `OnPush`.
- Organizacion por features: `core/` para capacidades singleton, `shared/` para piezas reutilizables y `features/` para dominios.
- Routing lazy por feature y proteccion declarativa mediante roles (`roleGuard`, `guestGuard`).
- Estado inicial local y mocks centralizados; evitar acoplar componentes a la fuente de datos.
- Diseno mobile-first desde 320 px. PWA preparada mediante manifest y metadatos; service worker se habilitara cuando exista estrategia offline.
- Mapas: Leaflet con OpenStreetMap (`shared/components/map`), cargados solo en las vistas que los usan (Senior Ubicación/Emergencia y Care Ubicación autorizada).
- Backend: `backend/` con FastAPI (Python 3.11), independiente de Angular. Hoy solo expone voz (`/api/voice/*`); la configuracion va en `backend/.env` (ver `.env.example`) y CORS esta limitado a `CORS_ORIGINS`.
- Evolucion prevista: PostgreSQL/Supabase, autenticacion JWT y Firebase Cloud Messaging. Solo la transcripcion de voz es una integracion real.

## Autenticación y roles

- `AuthService` (estado de sesión) delega en `AuthBackend` (`core/auth/auth-backend.ts`). Hoy lo implementa `MockAuthBackend`, con usuarios mock y contraseña demo; para Supabase Auth basta con proveer otra implementación en `app.config.ts`.
- Login por correo y contraseña, o «Modo demostración» por rol. Cada rol tiene su área, su layout y su menú: Senior usa barra inferior + «Más»; Care, Health y Admin usan sidebar en escritorio y drawer en móvil.
- Catálogo RBAC en `core/models/access.models.ts` (roles, permisos y matriz por defecto); Admin lo edita en memoria con `AdminDirectoryService`.

## Voz: dos sistemas, un micrófono y un Vosk

```text
LIA (pulsar Hablar) ──┐                                   ┌─▶ LiaService (conversación)
                      ├─ VoiceSessionCoordinator ─▶ AudioCaptureService ─▶ VoiceApiService ─▶ FastAPI ─▶ Vosk ─┤
Comandos globales ────┘   (IDLE | LIA | GLOBAL)    start/stop · continuo(VAD)   WAV 16 kHz                      └─▶ VoiceCommandService (parser «LIA, …»)
```

- `AudioCaptureService` es el único acceso al micrófono, con dos modos que nunca coinciden:
  - `start/stop` (LIA): MediaRecorder;
  - `startContinuous/stopContinuous` (comandos globales): Web Audio con AudioWorklet (ScriptProcessor como respaldo), reducción a 16 kHz y `UtteranceSegmenter`, un VAD local por energía con 400 ms previos y cierre tras 800 ms de silencio. Solo los tramos hablados se envían como WAV; el silencio no sale del navegador.
- `VoiceSessionCoordinatorService` (core) asigna el micrófono a un solo dueño. LIA tiene prioridad: al pulsar «Hablar», la voz global se pausa y, al terminar LIA, se reanuda. Al ocultar la pestaña todo se detiene y, al volver, la voz global se reanuda si sigue activa. Al cerrar sesión se desactiva.
- `VoiceCommandService` (senior):
  - activación con consentimiento explícito, nunca automática;
  - cola de frases → `VoiceApiService` → `parseGlobalVoiceCommand` (palabra de activación «LIA», intents `GlobalVoiceCommandIntent`);
  - ejecución sobre los servicios existentes: `EmergencyService`, `ContactsService`, `LiaService` y Router;
  - lo que no empieza con «LIA» se descarta sin mostrarse; «sí» y «cancelar» valen sin «LIA» solo si hay una pregunta pendiente.
- Vosk solo convierte voz en texto; las intenciones se resuelven en Angular. No se guarda audio ni transcripciones en ninguna capa.

## Voz de salida de LIA (TTS)

```text
Respuesta (texto visible) ─▶ LiaSpeechService ─▶ coordinator.beginSpeech() ─▶ escucha global en pausa (mic cerrado)
                                   │                      speechSynthesis.speak(utterance)
                                   └─ end / error / watchdog ─▶ 400 ms ─▶ coordinator.endSpeech() ─▶ la escucha global se reanuda si estaba activa
```

- `LiaSpeechService` (`core/services`) usa solo `window.speechSynthesis` y `SpeechSynthesisUtterance`, sin librerías. Estados `idle | speaking | paused | error`; expone `isSpeaking`, `currentMessage`, `voice` y `enabled`; métodos `speak(text, options)`, `stop()`, `pause()` y `resume()`. Valores iniciales: `es-MX`, rate 0,9, pitch 1 y volumen 1.
- Voz: Microsoft Dalia (es-MX) → cualquier es-MX → es-419 → es-ES → cualquier español (`pickLiaVoice`, por idioma y no solo por nombre). Las voces se leen con `getVoices()` y se actualizan con `voiceschanged`. Si una voz en línea falla, se descarta y se repite una vez con otra.
- Nunca suena con el micrófono abierto: antes de hablar, el coordinador pausa la escucha global (`pause('SPEECH')`, estado «En pausa mientras LIA habla.») y `requestGlobal()` se niega mientras `speaking`. Tampoco habla durante una grabación de LIA, y pulsar «Hablar» (`acquireLia`) la calla. Tras el final espera 400 ms antes de devolver el micrófono, porque algunos navegadores emiten `end` antes de que acabe el audio.
- Prioridades `CRITICAL` (emergencia) > `HIGH` (llamada, ubicación) > `NORMAL` (medicamentos, navegación) > `LOW` (informativos). Un mensaje más importante interrumpe al actual y descarta los pendientes menores; uno igual o menor espera en una cola de dos como máximo. Un watchdog proporcional al texto evita quedar bloqueado si `end` no llega.
- Quién habla: `VoiceCommandService` (respuesta de cada comando global), `LiaPageComponent` (respuesta de `LiaService.speech`, con avisos «Sí, te escuché.» y «Estoy procesando…» solo si tarda), `EmergencyService` (avance real: ubicación y registro, solo en solicitudes por voz) y `LocationPageComponent` (resultado del GPS pedido por voz). La voz nunca sustituye el mensaje visual.
- Veracidad: las frases describen solo lo que ocurrió (abrir el marcador, registrar en VITALIA). No nombran «LIA» ni terminan en «sí»/«cancelar», para que un eco no dispare comandos.
- En la página de LIA, las intenciones con destino abren la pantalla existente al terminar de hablar (Familia, Check-in, Autocuidado, Pensiones y trámites, Ubicación con `solicitar`), salvo que la persona vuelva a hablar o salga. La emergencia sigue requiriendo «Solicitar ayuda».
- En las solicitudes de emergencia por voz, la cuenta regresiva no avanza mientras LIA habla, para que la persona pueda decir «cancelar» con el micrófono abierto.
- Preferencia «Voz de LIA» en Accesibilidad (`AccessibilityPreferencesService.liaVoice`), guardada en `localStorage` (`vitalia.lia-voice`) por `LiaSpeechService`, que la aplica desde el inicio. Desactivarla solo silencia a LIA; Vosk y los comandos siguen igual.

## Emergencia unificada

- `EmergencyService` (senior) es el único flujo para las tres fuentes: `BUTTON` (SOS y confirmación explícita), `LIA` («Solicitar ayuda») y `GLOBAL_VOICE` (cuenta regresiva de 5 s y avance automático, o confirmación directa tras «Me siento mal» → «Sí»).
- Pide la ubicación solo tras confirmar (`LocationService` + consentimiento + fallback demo), avisa al `primaryEmergencyContact` de forma simulada y registra el evento con tipo (`HELP | SICK | FALL | DIZZY | OTHER`) y fuente.
- Los eventos viven en `EmergencyRegistryService` (core, en memoria) para que Care los consulte. `SeniorStateService.emergencyEvents` es un alias.
- Las llamadas usan `PhoneService` (`tel:` solo al pulsar; en escritorio, número visible y «Copiar número»). Nunca hay llamadas silenciosas ni contacto real con servicios de emergencia.

## Composición de layouts

- `core/layout/senior-layout` es presentacional y proyecta `[layoutBanner]`, `[layoutAside]` y `[layoutOverlay]`.
- La feature Senior lo compone en `SeniorShellComponent`, que añade la barra y los diálogos de voz y el aviso de emergencia en curso. Así `core` no depende de `features`, igual que `care/health/admin-layout` envuelven a `WorkspaceLayoutComponent`.
- Las secciones secundarias de Care, Health y Admin usan `WorkspacePageComponent` con datos mock por ruta (`features/<rol>/<rol>.pages.ts`). Las páginas clave tienen componente propio.

Flujo de dependencias: `features -> shared/core`; `shared` no depende de `features`; `core` no contiene UI de negocio. Los contratos de dominio viven en `core/models` y el acceso a datos detras de servicios.

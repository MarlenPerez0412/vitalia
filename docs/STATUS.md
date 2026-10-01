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
- **Documento de capturas por rol (2026-10-01):** `docs/VITALIA_capturas_rutas_por_rol.docx` incluye 54 capturas reales de navegación agrupadas por Acceso, SENIOR, CAREGIVER, HEALTH y ADMIN, con la ruta correspondiente de cada pantalla.
- **Autocuidado: 6 mini actividades interactivas (2026-10-01):** Se convirtió el módulo de Autocuidado en un espacio de minijuegos breves y accesibles para adultos mayores. Cada tarjeta del catálogo ahora tiene su propia ruta y actividad interactiva:
  - **Ejercicios mentales** → `/senior/self-care/find-different` (`FindDifferentPageComponent`): "Encuentra el diferente". 3 rondas aleatorias de 4 emojis (3 iguales + 1 diferente). Feedback amable.
  - **Memoria** → `/senior/self-care/memory-demo` (`CognitiveActivityPageComponent`): mejorado con pool de 11 palabras con emojis (🌷 Jardín, 🎵 Música…), selección y orden aleatorio en cada sesión.
  - **Razonamiento** → `/senior/self-care/whats-next` (`WhatsNextPageComponent`): "¿Qué sigue?". 3 rondas aleatorias de secuencias de patrones con 3 opciones grandes.
  - **Juegos cognitivos** → `/senior/self-care/classify` (`ClassifyPageComponent`): "Clasifica y combina". 5 ítems aleatorios, 3 categorías (🥗 Alimentos, 🐾 Animales, 🏠 Hogar).
  - **Actividad física** → `/senior/self-care/move-with-me` (`MoveWithMePageComponent`): "Muévete conmigo". 4 ejercicios suaves con barra de progreso visual de 5 s, botones Pausar/Siguiente/Terminar.
  - **Bienestar emocional** → `/senior/self-care/breathe` (`BreathePageComponent`): "Respira conmigo". 3 ciclos inhala/exhala de 4 s con animación CSS; respeta `prefers-reduced-motion`; al terminar pregunta cómo se siente.
  - Todos usan `app-senior-page`, botón Volver, identidad visual Vitalía. Sin rankings, cronómetros competitivos ni mensajes negativos. Build validado sin errores.
- **Emojis en Check-in diario (2026-10-01):** Se agregaron emojis a las 4 pantallas del flujo de bienestar emocional (`checkin-page.component.ts/scss`). Cada opción de estado de ánimo, sueño y molestia muestra un emoji grande con `aria-hidden="true"` y `aria-label` descriptivo en el botón. El título de la pantalla 4 incluye 💬. No se modificó navegación, backend, modelos ni otros módulos. Build de producción validado sin errores.

- **Diagnostico TTS del navegador (2026-09-30):** utilidad temporal y aislada `speech-synthesis-voices.debug.ts` para consultar `speechSynthesis.getVoices()` sin integrarla al flujo de voz de LIA ni modificar la interfaz.
- **Voz de salida de LIA (2026-09-30):**
  - `LiaSpeechService` (`speechSynthesis`): voz Dalia es-MX con respaldo es-MX → es-419 → es-ES → español; cola por prioridad y watchdog.
  - Volumen de LIA normalizado al máximo permitido por el navegador (`SpeechSynthesisUtterance.volume = 1`); cualquier valor mayor se limita a 1 para evitar comportamiento inválido.
  - Coordinación con Vosk: micrófono cerrado mientras LIA habla y reanudación de la escucha global solo si estaba activa.
  - Responden por voz:
    - comandos globales (ayuda, me siento mal, me caí, llamadas, ubicación, medicamentos, abrir emergencia, confirmar, cancelar, no entendido);
    - el avance real de la emergencia por voz;
    - el GPS pedido por voz;
    - las respuestas de LIA, que abren la pantalla existente que anuncian.
  - Preferencia «Voz de LIA» en Accesibilidad, guardada en el dispositivo.
  - 159 pruebas frontend (antes 111) y 9 backend. E2E en Edge con Vosk real y micrófono falso.
- **Módulo Entretenimiento enriquecido con imágenes (2026-10-01):** Se añadió `variant="poster"` a `EntertainmentCardComponent` (imagen de ancho completo arriba, cuerpo abajo, fallback a ícono con señal reactiva `imgFailed`). Los 6 mock JSON (`movies`, `events`, `news`, `music`, `crafts`, `activities`) recibieron URLs de imagen (`picsum.photos` con semilla fija = imagen consistente). Los 6 page components (`movies`, `theater`, `news`, `music`, `crafts`, `activities`) ahora pasan `[image]` y `variant="poster"`. Se extendieron los modelos `CultureEvent`, `NewsItem`, `Craft` y `Activity` con `image?`. Solo se tocó el módulo Entretenimiento; build de producción validado sin errores.
- **Notificaciones funcionales por rol (2026-10-01):**
  - `NotificationService` (`core/services`) y `NotificationEventsService` (reglas de a quién avisar); campana `NotificationBellComponent` en el Topbar de los cuatro roles, sin cambios de diseño.
  - Persistencia mock: semilla `core/mock/notifications.seed.json` + `localStorage` (`vitalia.notifications`). Método `resetNotifications()` listo (no existe aún un reset general de demo).
  - Eventos conectados: emergencia (Senior + Caregiver), toma/omisión de medicamento (`skipMedication`, nuevo estado `SKIPPED`), cambio Prevent (Senior, Caregiver, Health) y auditoría de Admin (usuarios, roles, permisos).
  - 13 pruebas nuevas (172 en total).
- **Notificaciones: pendientes resueltos y sincronización entre pestañas (2026-10-01):**
  - Sincronización: evento `storage` (helper `core/utils/storage-sync.ts`) en notificaciones, emergencias, consentimientos y seguimientos. María en una pestaña y Ana en otra ven los cambios sin recargar.
  - `EmergencyRegistryService` ahora persiste en `localStorage` (`vitalia.emergencies`) **sin coordenadas** (la ubicación solo vive en la pestaña de origen) y permite `markAttended`; Care tiene el botón «Marcar como atendida», que avisa a Senior y a su red.
  - `SharingConsentService` (`vitalia.sharing`) es la fuente del consentimiento: la pantalla Privacidad de Senior lo usa y las notificaciones a Caregiver/Health lo consultan. Autorizar o revocar avisa a la cuidadora.
  - Botón «Omitir» en medicamentos pendientes, check-in con malestar (avisa a Caregiver si se comparte Bienestar) y seguimiento de Health (`HealthFollowUpService`, botón «Registrar seguimiento de María»).
  - 27 pruebas nuevas en total para notificaciones (199 en total).

- **Entretenimiento Senior funcional (2026-10-01):** seis rutas hijas (`/senior/entertainment/movies|theater|news|music|crafts|activities`), cada tarjeta del hub navega a la suya y «Volver» siempre regresa a `/senior/entertainment`. Servicios por sección con API opcional vía FastAPI (`/api/entertainment/*`) y fallback automático a mocks JSON; sin claves todo funciona offline. Pruebas: 247 frontend (antes 199 + otras sesiones) y 19 backend. No se probó con claves reales ni con revisión visual en navegador.

- **LIA — separación de modos de voz y UX clarificada (2026-10-01):** `VoiceCommandBarComponent` ahora recibe `isLia` signal input. Cuando la ruta activa es `/senior/lia`, el aside lateral muestra: botón rojo "Necesito ayuda" (→ EmergencyService fuente LIA), tarjeta "Modo conversación activo" y tarjeta de privacidad — sin micrófono global ni "Activar comandos de voz". En cualquier otra pantalla Senior el comportamiento original se mantiene. `SeniorShellComponent` calcula `isLiaPage` con la URL. El botón duplicado del chat header fue eliminado de `lia-page.component.ts`. Separación `globalVoiceCommandMode` / `chatVoiceMode` ya existía vía `VoiceSessionCoordinatorService` — no se tocó. Build OK.

- **Centro de módulos "Pensiones y trámites" — Calendario central único (2026-10-01):** Se eliminó la clase `CalendarPageComponent` duplicada. Se rediseñó el calendario con layout de 3 columnas: sidebar de categorías con checkboxes + toggle "Mostrar todas" (Pensión Bienestar, IMSS, ISSSTE, SAT, Servicios, Citas médicas, Trámites, Depósitos, Personal, Otros), grilla mensual con eventos como pills de color por categoría, y panel derecho con "Próximos eventos" y "Detalle del evento" (Editar/Eliminar/Marcar completado). Nuevas categorías en el modelo: SERVICES, TRAMITE, PERSONAL. Build OK.

- **Foto de perfil de María (2026-10-01):** Se reemplazaron los avatares de iniciales de los componentes `ProfilePageComponent` y `SeniorHomeComponent` por una imagen `<img>` circular (Unsplash, señora mayor representativa). El estilo se mantiene con `border-radius: 50%` y `object-fit: cover`. Build de producción validado sin errores.

## En progreso

- **Acuse bidireccional para frases informativas (2026-10-01):** las frases seleccionadas del libro que todavía no tienen una intención de negocio, como despedidas y saludos, ahora se envían al chat y reciben un acuse en la misma lengua (`Nimitzcactoc.` / `Binadiaʼgaʼ lii.`) con TTS, sin ejecutar acciones. Las frases con intención existente conservan sus respuestas traducidas. Pruebas focalizadas 32/32; build OK.

- **Respuestas traducidas con TTS indígena (2026-10-01):** se incorporaron las traducciones proporcionadas para caída, malestar, ubicación, check-in, emergencia, contacto, cancelación, confirmación y medicamento tomado en `PILOT_MESSAGES`. `PhrasebookService` las resuelve por idioma; `LiaOutputService` usa primero audio grabado/proveedor nativo y después `speechSynthesis` con `lang: nah` o `lang: zap`. Pruebas multilingües y TTS: 38/38; build OK. La pronunciación nativa depende de una voz `nah`/`zap` instalada en el navegador o sistema.

- **Frases seleccionables con conversación bidireccional (2026-10-01):** cada frase del libro de LIA tiene ahora una acción «Enviar frase a LIA». La selección entra al mismo método `send()` que el texto y la voz, conserva `nahuatl-pilot` o `zapoteco-pilot` como variante y recibe la respuesta en ese idioma cuando existe una intención traducida. Se añadió prueba del flujo usuario → LIA: 18/18 pruebas focalizadas; build OK. Las frases sin intención/respuesta específica siguen mostrando el aviso de no reconocimiento hasta recibir su respuesta traducida.

- **Texto a voz para frases indígenas (2026-10-01):** el botón de reproducción del libro de frases usa `LiaSpeechService` con `lang: 'nah'` para náhuatl y `lang: 'zap'` para zapoteco; si posteriormente existe un audio nativo registrado, lo reproduce primero. `LiaSpeechService` ahora selecciona una voz compatible con el idioma solicitado. La pronunciación depende de que el navegador/sistema tenga instalada una voz `nah` o `zap`; no se fuerza la voz española. Build OK; pruebas focalizadas 35/35.

- **Catálogo textual indígena ampliado (2026-10-01):** se agregaron al libro de frases de LIA las frases proporcionadas para confirmación, cancelación, caída, malestar, ubicación, medicamento tomado, check-in, emergencias, contacto de emergencia, saludos y despedidas en náhuatl y zapoteco. No se mapearon frases nuevas a acciones existentes cuando la intención no coincide exactamente; no hay audio nativo todavía. Build OK.

- **LIA: botón de ayuda único y catálogo indígena sin etiqueta visual de piloto (2026-10-01):** en la pantalla LIA se eliminó el botón duplicado de `VoiceCommandBarComponent`; queda el botón global de ayuda de `SeniorLayoutComponent`. Se retiró la etiqueta «Piloto» del libro de frases y del nombre visible del idioma en LIA. El catálogo sigue preparado para reproducir audios nativos mediante `audio`, pero actualmente no hay grabaciones en `public/audio`; no se usa TTS español para imitar náhuatl o zapoteco. Build OK.

- **Pensiones y trámites separado por submódulos (2026-10-01):** `/senior/pensions` ahora es un hub local con Calendario general, Pensión Bienestar, IMSS, ISSSTE, SAT e Historial de depósitos. Se añadieron vistas contextuales independientes con mini agendas; solo `/senior/pensions/calendar` muestra el calendario mensual y categorías. Los enlaces contextuales abren el calendario con su filtro activo y los depósitos filtran por bimestre. Build OK; el calendario y el estado compartido global no se reescribieron.

- **Modo de espera por wake word de LIA (2026-10-01):** tras conceder el permiso, los comandos globales mantienen una única sesión de micrófono en espera pasiva y solo procesan «Hola LIA». La detección cambia a `command-listening`, reutiliza el flujo existente y vuelve a `wake-listening` después de la respuesta; mientras LIA habla, el coordinador suspende la captura para evitar eco. Se añadieron registros de ciclo `[LIA VOICE]` y pruebas de sesión única. Build OK; prueba focalizada 15/15; suite completa 354/355 por la falla preexistente de `utterance-segmenter.spec.ts`.

- **Libro de frases LIA y limpieza del modo lateral (2026-10-01):** el aside de la pantalla LIA conserva únicamente el botón «Necesito ayuda» con icono de mano levantada. La página LIA incorpora un catálogo local filtrable por lengua y tema para frases piloto de náhuatl y zapoteco, muestra su significado en español y deja el botón de audio deshabilitado hasta contar con grabaciones nativas validadas; los accesos rápidos usan las frases canónicas del idioma piloto activo. Build OK; 353 de 354 pruebas pasan (falla preexistente de VAD en `utterance-segmenter.spec.ts`).

- **LIA multilingüe (es-MX + zapoteco `zaa`, piloto), 2026-10-01.** Plan de 6 fases aprobado.
  - Fase 1 terminada: núcleo de idiomas en `core/i18n` con `LanguageContextService`, `PhrasebookService`, catálogos `es-MX.json` y `zaa.json` (63 claves) y los formateadores es-MX.
  - Sin cambios visibles ni de comportamiento.
  - Fase 2 terminada: LIA, los comandos globales, la emergencia y la ubicación hablan a través de la capa de idiomas.
    - `PhrasebookService` + `LiaOutputService`;
    - `LiaSpeechService.playClip()` reproduce clips con la misma cola y el mismo bloqueo de micrófono;
    - léxico de intenciones por variante.
    - El español sigue igual: las pruebas existentes pasan sin cambios.
  - Fase 3 terminada: modo zapoteco en el frontend, sin modelos.
    - Panel «Idioma de VITALIA» en Accesibilidad: idioma, variante, respaldo en español, estado de los modelos y licencia.
    - En LIA: insignia del idioma y botón de cambio.
    - Nota visible «traducción pendiente».
    - Detector de idioma conservador.
    - Proveedores de reconocimiento por variante: nunca se manda zapoteco a Vosk.
    - Pruebas de simetría con datos `[ZAA_TEST]`.
  - Fase 4 terminada y redefinida, sin ASR nativo: comandos predeterminados en español, náhuatl piloto y zapoteco piloto, funcionando con los mocks.
    - **Catálogo central** en `core/i18n/lia-multilingual-intents.ts`:
      - tres intenciones (`NEXT_MEDICATION`, `HELP`, `CALL_DAUGHTER`), cada una con su frase canónica, aliases, plantilla de respuesta, confirmación y `voskVariants`;
      - las frases son las del equipo, predeterminadas para el MVP; los pilotos llevan `variantStatus: 'pilot'` y `nativeValidation: false`.
    - **Preferencia** `liaLanguage`: es `'es'` por defecto y se guarda en `localStorage` (`vitalia.lia-language`). El selector está en Perfil → Accesibilidad: Español, Náhuatl (piloto) y Zapoteco (piloto).
    - **Reconocimiento:**
      - en español, Vosk como siempre;
      - en los pilotos, Vosk español como respaldo **experimental**, seguido de `normalizeVoicePhrase()` y `MultilingualVoiceIntentMatcher` (exacto, aliases, `voskVariants`, similitud);
      - con confianza baja no se ejecuta nada, y HELP exige al menos 0,9, así que una aproximación nunca dispara la emergencia;
      - sin coincidencia aparece «No pude reconocer ese comando. Puedes repetirlo o usar español.» y no se ejecuta ninguna acción.
    - **Respuestas:** salen en el idioma de la entrada, con datos reales de `SeniorStateService` y `ContactsService` (`{medication}`, `{dose}`, `{time}`, `{contactName}`). Lo que no tiene traducción piloto se muestra en español con un aviso.
    - **Llamada:** «Llamar a mi hija» abre la confirmación de llamada existente; nunca marca sola.
    - **Voz:** el español usa `LiaSpeechService` como siempre. Las respuestas piloto se muestran **solo en texto**:
      - no hay TTS nativo y nunca se leen con la voz española;
      - el flag `LIA_EXPERIMENTAL_TTS_ENABLED` está apagado por defecto;
      - existe una interfaz `PilotTtsProvider` para un proveedor futuro.
    - **Registro de desarrollo** (`VoiceDebugLogService`, solo en desarrollo): idioma, texto de Vosk, texto normalizado, intención, confianza y acción. No guarda audio.
    - Se retiraron el catálogo `zaa.json` y los datos `[ZAA_TEST]`.
    - Build: OK.
    - Pruebas: 354 de 354.
  - **Límites reales:** náhuatl y zapoteco son pilotos y solo cubren tres comandos; no son cobertura del idioma. Ninguna frase la ha validado un hablante nativo, y el reconocimiento por voz en los pilotos es poco fiable (Vosk español produce palabras sin sentido).

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
- Notificaciones: los vínculos María↔Ana↔Dr. Ruiz siguen fijos como ids demo en `NotificationEventsService` (el consentimiento sí es real, pero no hay modelo de vínculos por persona). Las emergencias persistidas no guardan coordenadas, así que Care en otra pestaña no ve el mapa. Sin reset general de demo (solo `resetNotifications()` y `SharingConsentService.reset()`). Todo es localStorage: no hay tiempo real entre dispositivos hasta tener backend.

- Script independiente `backend/scripts/asistente_offline.py` y ejecutable de pruebas `prueba.py` integrados: cliente de voz offline (`AsistenteVitaliaOffline`) con Vosk + PyAudio + pyttsx3 (wake word «Vitalia»/«Italia», velocidad 140 para adultos mayores, resolución inteligente de ruta al modelo `backend/models/vosk-model-es-0.42` y compatibilidad Windows Kaldi). Incluye hoja de ruta documentada para hibridación con `faster-whisper` y fine-tuning acústico sobre el corpus OpenSLR 148 (Náhuatl de Puebla).

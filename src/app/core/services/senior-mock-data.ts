import { CatalogDefinition, MedicationDemo, MedicationHistoryEntry, PreventFactor, SeniorContact, SignatureMetric } from '../../features/senior/models/senior.models';

export const SENIOR_DEMO_PROFILE = {
  id: 'senior-maria-demo',
  name: 'María Hernández',
  preferredName: 'María',
  birthDate: '1953-04-18',
  healthInstitution: 'IMSS',
} as const;

/** Red de apoyo autorizada por María. Telefonos ficticios (no marcar a numeros reales en la demo). */
export const CONTACTS_DEMO: readonly SeniorContact[] = [
  { id: 'contact-ana-demo', name: 'Ana Hernández', relationship: 'Hija', relationshipKey: 'DAUGHTER', phone: '+52 55 0000 0000', availability: 'Disponible ahora', primaryEmergency: true },
  { id: 'contact-luis-demo', name: 'Luis Hernández', relationship: 'Hijo', relationshipKey: 'SON', phone: '+52 55 0000 0001', availability: 'Disponible por la tarde', primaryEmergency: false },
];

export const MEDICATIONS_DEMO: readonly MedicationDemo[] = [
  { id: 'med-losartan', name: 'Losartán', dose: '50 mg · Con agua', time: '8:00 AM', period: 'MORNING', status: 'TAKEN' },
  { id: 'med-metformin', name: 'Metformina', dose: '500 mg · Con alimentos', time: '10:00 AM', period: 'MORNING', status: 'PENDING' },
  { id: 'med-vitamin-d', name: 'Vitamina D', dose: '1 cápsula', time: '2:00 PM', period: 'AFTERNOON', status: 'UPCOMING' },
  { id: 'med-atorvastatin', name: 'Atorvastatina', dose: '20 mg', time: '9:00 PM', period: 'NIGHT', status: 'UPCOMING' },
] as const;

export const MEDICATION_HISTORY_DEMO: readonly MedicationHistoryEntry[] = [
  { id: 'history-1', medication: 'Losartán', dose: '50 mg', scheduledTime: 'Hoy · 8:00 AM', recordedAt: '8:03 AM', status: 'Tomado' },
  { id: 'history-2', medication: 'Metformina', dose: '500 mg', scheduledTime: 'Ayer · 10:00 AM', recordedAt: '10:08 AM', status: 'Tomado' },
  { id: 'history-3', medication: 'Atorvastatina', dose: '20 mg', scheduledTime: 'Ayer · 9:00 PM', recordedAt: '9:01 PM', status: 'Tomado' },
] as const;

export const SIGNATURE_METRICS: readonly SignatureMetric[] = [
  { label: 'Movilidad', value: 82, detail: 'Dentro de tu ritmo habitual', tone: 'success' },
  { label: 'Medicamentos', value: 95, detail: 'Plan casi completo', tone: 'success' },
  { label: 'Bienestar', value: 78, detail: 'Estable esta semana', tone: 'normal' },
  { label: 'Cognición', value: 84, detail: 'Actividad habitual', tone: 'success' },
  { label: 'Interacción social', value: 80, detail: 'Contacto frecuente', tone: 'normal' },
] as const;

export const PREVENT_FACTORS: readonly PreventFactor[] = [
  { label: 'Actividad', value: '↓ 28%', detail: 'Menor que tu rutina habitual', severity: 'attention' },
  { label: 'Bienestar', value: '3 días', detail: 'Registro por debajo de lo habitual', severity: 'attention' },
  { label: 'Medicamentos', value: '1 omitido', detail: 'Durante los últimos siete días', severity: 'urgent' },
] as const;

export const DEMO_LOCATION = {
  latitude: 19.4321,
  longitude: -99.1337,
  label: 'Ubicación ficticia de María',
  updatedAt: 'Hoy, 10:15 AM',
} as const;

export const SENIOR_CATALOGS: Readonly<Record<string, CatalogDefinition>> = {
  health: {
    eyebrow: 'Mi salud', title: 'Salud', description: 'Tu plan, indicadores y seguimiento en un solo lugar.', color: 'coral',
    items: [
      { title: 'Medicamentos', description: 'Consulta horarios y registra tus tomas.', icon: 'pill', route: '/senior/medications' },
      { title: 'Historial', description: 'Revisa tus registros recientes.', icon: 'activity', route: '/senior/medications/history' },
      { title: 'Firma VITALIA', description: 'Conoce tu rutina personal de bienestar.', icon: 'sparkles', route: '/senior/signature' },
      { title: 'Índice VITALIA', description: 'Un resumen comprensible de tu constancia.', icon: 'activity', route: '/senior/vitalia-index' },
      { title: 'VITALIA Prevent', description: 'Cambios tempranos respecto a tu rutina.', icon: 'shield', route: '/senior/prevent' },
    ],
  },
  wellbeing: {
    eyebrow: 'Cómo me siento', title: 'Bienestar', description: 'Registrar cómo estás toma menos de dos minutos.', color: 'lilac',
    items: [
      { title: 'Check-in diario', description: 'Cuéntanos cómo te sientes hoy.', icon: 'heart', route: '/senior/wellbeing/checkin' },
      { title: 'Cognición', description: 'Actividades breves para memoria y atención.', icon: 'brain', route: '/senior/self-care/memory-demo' },
      { title: 'Firma VITALIA', description: 'Compara contigo misma, no con otras personas.', icon: 'sparkles', route: '/senior/signature' },
      { title: 'Autocuidado', description: 'Actividades para mente, cuerpo y emociones.', icon: 'brain', route: '/senior/self-care' },
    ],
  },
  security: {
    eyebrow: 'Acompañamiento con privacidad', title: 'Seguridad', description: 'Decide cómo y cuándo puede apoyarte tu red.', color: 'green',
    items: [
      { title: 'Ubicación', description: 'Consulta tu ubicación cuando la necesites.', icon: 'map-pin', route: '/senior/location' },
      { title: 'Emergencia', description: 'Pide ayuda con un toque o diciendo «LIA, necesito ayuda».', icon: 'emergency', route: '/senior/emergency' },
      { title: 'Contactos', description: 'Personas autorizadas para ayudarte.', icon: 'users', route: '/senior/family' },
      { title: 'Actividad diaria', description: 'Resumen de cambios en tu rutina.', icon: 'activity', route: '/senior/prevent' },
      { title: 'Alertas de inactividad', description: 'Avisos configurables para tu red.', icon: 'alert' },
      { title: 'Zonas seguras', description: 'Lugares de confianza definidos por ti.', icon: 'shield' },
      { title: 'Privacidad', description: 'Controla exactamente lo que compartes.', icon: 'shield', route: '/senior/privacy' },
    ],
  },
  pensions: {
    eyebrow: 'Información útil', title: 'Pensiones y trámites', description: 'Referencias de demostración, sin conexión con instituciones.', color: 'yellow',
    items: [
      { title: 'Pensión Bienestar', description: 'Próximo periodo: nov–dic · 2 eventos programados.', icon: 'heart', route: '/senior/pensions/calendar?filter=PENSION' },
      { title: 'IMSS', description: '2 eventos próximos: cita y entrega de estudios.', icon: 'shield', route: '/senior/pensions/calendar?filter=IMSS' },
      { title: 'ISSSTE', description: '2 trámites próximos: credencial y revisión de pensión.', icon: 'shield', route: '/senior/pensions/calendar?filter=ISSSTE' },
      { title: 'SAT', description: '2 recordatorios: declaración y cita pendiente.', icon: 'user', route: '/senior/pensions/calendar?filter=SAT' },
      { title: 'Calendario general', description: 'Todos tus eventos de pensiones y trámites juntos.', icon: 'activity', route: '/senior/pensions/calendar' },
      { title: 'Historial de depósitos', description: 'Movimientos simulados de bimestres anteriores.', icon: 'activity', route: '/senior/pensions/calendar?filter=DEPOSIT' },
    ],
  },
  selfCare: {
    eyebrow: 'Tiempo para mí', title: 'Autocuidado', description: 'Opciones breves para cuidar mente, cuerpo y emociones.', color: 'lilac',
    items: [
      { title: 'Ejercicios mentales', description: 'Encuentra el diferente. Activa tu atención.', icon: 'brain', route: '/senior/self-care/find-different' },
      { title: 'Memoria', description: 'Recuerda la secuencia. Una actividad corta y amigable.', icon: 'brain', route: '/senior/self-care/memory-demo' },
      { title: 'Razonamiento', description: '¿Qué sigue? Reconoce patrones a tu ritmo.', icon: 'sparkles', route: '/senior/self-care/whats-next' },
      { title: 'Juegos cognitivos', description: 'Clasifica y combina. Práctica agradable sin presión.', icon: 'brain', route: '/senior/self-care/classify' },
      { title: 'Actividad física', description: 'Muévete conmigo. Movimientos suaves para tu cuerpo.', icon: 'activity', route: '/senior/self-care/move-with-me' },
      { title: 'Bienestar emocional', description: 'Respira conmigo. Una pausa para respirar con calma.', icon: 'heart', route: '/senior/self-care/breathe' },
    ],
  },
  entertainment: {
    eyebrow: 'Disfrutar también es bienestar', title: 'Entretenimiento', description: 'Ideas de contenido y actividades para tu tiempo libre.', color: 'blue',
    items: [
      { title: 'Películas', description: 'Selección familiar de demostración.', icon: 'sparkles', route: '/senior/entertainment/movies' },
      { title: 'Teatro', description: 'Cartelera cultural simulada.', icon: 'users', route: '/senior/entertainment/theater' },
      { title: 'Noticias', description: 'Resumen de fuentes por definir.', icon: 'activity', route: '/senior/entertainment/news' },
      { title: 'Música', description: 'Tus favoritos en una futura integración.', icon: 'heart', route: '/senior/entertainment/music' },
      { title: 'Manualidades', description: 'Proyectos sencillos paso a paso.', icon: 'sparkles', route: '/senior/entertainment/crafts' },
      { title: 'Actividades recreativas', description: 'Opciones cercanas y accesibles.', icon: 'users', route: '/senior/entertainment/activities' },
    ],
  },
};

import { WorkspacePageConfig } from '../../shared/components/workspace-page/workspace-page.models';

/** Datos de demostracion de las secciones de Care (sin backend). */
export const CARE_PAGES: Readonly<Record<string, WorkspacePageConfig>> = {
  people: {
    eyebrow: 'Red de cuidado', title: 'Personas a mi cuidado', description: 'Personas que te autorizaron a acompañarlas.',
    notice: 'Solo ves la información que cada persona decidió compartir contigo.',
    people: [
      { name: 'María Hernández', summary: 'Bienestar estable. Plan de medicamentos casi completo.', lastContact: 'Hoy, 9:10 AM', wellbeingLabel: 'Bien', wellbeingTone: 'success' },
      { name: 'Rosa Méndez', summary: 'Registró menos actividad esta semana.', lastContact: 'Ayer, 6:40 PM', wellbeingLabel: 'Atención', wellbeingTone: 'attention' },
    ],
  },
  medications: {
    eyebrow: 'Seguimiento autorizado', title: 'Medicamentos', description: 'Adherencia compartida por María.',
    metrics: [
      { label: 'Adherencia semanal', value: '95 %', detail: 'Un medicamento omitido en 7 días', icon: 'pill', tone: 'success' },
      { label: 'Tomas de hoy', value: '1 de 4', detail: 'Metformina pendiente a las 10:00 AM', icon: 'check', tone: 'warning' },
      { label: 'Próxima toma', value: '10:00 AM', detail: 'Metformina 500 mg', icon: 'bell', tone: 'secondary' },
    ],
    tables: [{
      caption: 'Plan de María Hernández',
      columns: [{ key: 'medication', label: 'Medicamento' }, { key: 'dose', label: 'Dosis' }, { key: 'time', label: 'Horario' }, { key: 'status', label: 'Estado' }],
      rows: [
        { medication: 'Losartán', dose: '50 mg', time: '8:00 AM', status: 'Tomado' },
        { medication: 'Metformina', dose: '500 mg', time: '10:00 AM', status: 'Pendiente' },
        { medication: 'Vitamina D', dose: '1 cápsula', time: '2:00 PM', status: 'Próximo' },
        { medication: 'Atorvastatina', dose: '20 mg', time: '9:00 PM', status: 'Próximo' },
      ],
    }],
  },
  wellbeing: {
    eyebrow: 'Cómo se siente', title: 'Bienestar', description: 'Resumen de los check-ins compartidos.',
    metrics: [
      { label: 'Estado de ánimo', value: 'Bien', detail: 'Promedio de los últimos 7 días', icon: 'heart', tone: 'success' },
      { label: 'Sueño', value: '7 h', detail: 'Dentro de su rutina habitual', icon: 'sparkles', tone: 'secondary' },
      { label: 'Check-ins', value: '5 de 7', detail: 'Esta semana', icon: 'check', tone: 'primary' },
    ],
    insights: [{ title: 'Rutina estable', description: 'María mantiene su rutina de bienestar respecto a su propio historial.', source: 'Firma VITALIA' }],
  },
  activity: {
    eyebrow: 'Rutina diaria', title: 'Actividad', description: 'Cambios en la rutina, comparados con su propio historial.',
    metrics: [
      { label: 'Actividad', value: '−12 %', detail: 'Respecto a su semana habitual', icon: 'activity', tone: 'warning' },
      { label: 'Actividades cognitivas', value: '3', detail: 'Completadas esta semana', icon: 'brain', tone: 'secondary' },
    ],
    tables: [{
      caption: 'Actividad reciente',
      columns: [{ key: 'when', label: 'Cuándo' }, { key: 'activity', label: 'Actividad' }, { key: 'detail', label: 'Detalle' }],
      rows: [
        { when: 'Hoy, 9:10 AM', activity: 'Check-in diario', detail: 'Se siente bien, durmió 7 horas' },
        { when: 'Hoy, 8:03 AM', activity: 'Medicamento', detail: 'Losartán registrado' },
        { when: 'Ayer, 5:30 PM', activity: 'Memoria', detail: 'Actividad breve completada' },
      ],
    }],
  },
  alerts: {
    eyebrow: 'Avisos', title: 'Alertas', description: 'Señales que requieren tu atención. Las emergencias tienen su propia sección.',
    alerts: [
      { title: 'Toma pendiente', description: 'Metformina de las 10:00 AM aún no está confirmada.', timestamp: 'Hace 20 minutos', severity: 'attention' },
      { title: 'Menos actividad', description: 'La actividad de esta semana es menor a la habitual.', timestamp: 'Hoy', severity: 'attention' },
    ],
  },
  reports: {
    eyebrow: 'Resúmenes', title: 'Reportes', description: 'Resúmenes periódicos de la información autorizada.',
    tables: [{
      caption: 'Reportes disponibles',
      columns: [{ key: 'report', label: 'Reporte' }, { key: 'period', label: 'Periodo' }, { key: 'status', label: 'Estado' }],
      rows: [
        { report: 'Adherencia a medicamentos', period: 'Septiembre 2026', status: 'Listo' },
        { report: 'Bienestar semanal', period: 'Semana 39', status: 'Listo' },
        { report: 'Actividad y rutina', period: 'Septiembre 2026', status: 'En preparación' },
      ],
    }],
  },
  messages: {
    eyebrow: 'Comunicación', title: 'Mensajes', description: 'Conversaciones con las personas a tu cuidado.',
    notice: 'Mensajería simulada: todavía no se envían mensajes reales.',
    tables: [{
      caption: 'Mensajes recientes',
      columns: [{ key: 'from', label: 'De' }, { key: 'message', label: 'Mensaje' }, { key: 'when', label: 'Cuándo' }],
      rows: [
        { from: 'María Hernández', message: '¡Buenos días! Ya desayuné.', when: 'Hoy, 8:30 AM' },
        { from: 'Tú', message: 'Qué gusto, mamá. Te llamo al mediodía.', when: 'Hoy, 8:34 AM' },
      ],
    }],
  },
};

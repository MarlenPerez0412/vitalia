import { WorkspacePageConfig } from '../../shared/components/workspace-page/workspace-page.models';

const PATIENT_COLUMNS = [{ key: 'patient', label: 'Paciente' }, { key: 'age', label: 'Edad' }, { key: 'status', label: 'Estado' }, { key: 'lastUpdate', label: 'Última actualización' }] as const;

/** Datos de demostracion del panel profesional. No es un expediente clinico: solo informacion autorizada. */
export const HEALTH_PAGES: Readonly<Record<string, WorkspacePageConfig>> = {
  dashboard: {
    eyebrow: 'Atención profesional', title: 'Panel de seguimiento', description: 'Información relevante y autorizada de tus pacientes.',
    notice: 'Solo ves datos que cada paciente autorizó. VITALIA no reemplaza la valoración clínica.',
    metrics: [
      { label: 'Pacientes vinculados', value: '3', detail: '2 con seguimiento activo', icon: 'users', tone: 'primary' },
      { label: 'Adherencia promedio', value: '91 %', detail: 'Últimos 7 días', icon: 'pill', tone: 'success' },
      { label: 'Alertas relevantes', value: '2', detail: 'Requieren revisión', icon: 'bell', tone: 'warning' },
    ],
    people: [
      { name: 'María Hernández', summary: '73 años · Hipertensión y diabetes tipo 2 en control.', lastContact: 'Hoy, 9:10 AM', wellbeingLabel: 'Estable', wellbeingTone: 'success' },
      { name: 'Rosa Méndez', summary: '79 años · Disminución de actividad esta semana.', lastContact: 'Ayer', wellbeingLabel: 'Atención', wellbeingTone: 'attention' },
    ],
    alerts: [{ title: 'Toma omitida', description: 'María omitió una dosis de Metformina esta semana.', timestamp: 'Hace 2 días', severity: 'attention' }],
  },
  patients: {
    eyebrow: 'Atención profesional', title: 'Pacientes', description: 'Personas que autorizaron tu seguimiento.',
    tables: [{ caption: 'Pacientes vinculados', columns: PATIENT_COLUMNS, rows: [
      { patient: 'María Hernández', age: 73, status: 'Estable', lastUpdate: 'Hoy, 9:10 AM' },
      { patient: 'Rosa Méndez', age: 79, status: 'Atención', lastUpdate: 'Ayer, 6:40 PM' },
      { patient: 'José Pérez', age: 81, status: 'Estable', lastUpdate: 'Hace 3 días' },
    ] }],
  },
  followUp: {
    eyebrow: 'Plan de cuidado', title: 'Seguimiento', description: 'Próximas revisiones y notas de seguimiento.',
    tables: [{ caption: 'Agenda de seguimiento', columns: [{ key: 'patient', label: 'Paciente' }, { key: 'task', label: 'Seguimiento' }, { key: 'date', label: 'Fecha' }], rows: [
      { patient: 'María Hernández', task: 'Revisión de presión arterial', date: '7 de octubre' },
      { patient: 'Rosa Méndez', task: 'Llamada de acompañamiento', date: '2 de octubre' },
    ] }],
  },
  medications: {
    eyebrow: 'Tratamiento', title: 'Medicamentos', description: 'Adherencia registrada por los pacientes.',
    metrics: [
      { label: 'Adherencia de María', value: '95 %', detail: '1 omisión en 7 días', icon: 'pill', tone: 'success' },
      { label: 'Adherencia de Rosa', value: '84 %', detail: '3 omisiones en 7 días', icon: 'pill', tone: 'warning' },
    ],
    tables: [{ caption: 'Plan de María Hernández', columns: [{ key: 'medication', label: 'Medicamento' }, { key: 'dose', label: 'Dosis' }, { key: 'schedule', label: 'Horario' }], rows: [
      { medication: 'Losartán', dose: '50 mg', schedule: '8:00 AM' },
      { medication: 'Metformina', dose: '500 mg', schedule: '10:00 AM' },
      { medication: 'Vitamina D', dose: '1 cápsula', schedule: '2:00 PM' },
      { medication: 'Atorvastatina', dose: '20 mg', schedule: '9:00 PM' },
    ] }],
  },
  wellbeing: {
    eyebrow: 'Autorreporte', title: 'Bienestar', description: 'Check-ins compartidos por los pacientes.',
    metrics: [
      { label: 'Ánimo promedio', value: '4 / 5', detail: 'María, últimos 7 días', icon: 'heart', tone: 'success' },
      { label: 'Sueño promedio', value: '7 h', detail: 'María, últimos 7 días', icon: 'sparkles', tone: 'secondary' },
    ],
  },
  cognition: {
    eyebrow: 'Actividad cognitiva', title: 'Cognición', description: 'Participación en actividades de memoria y atención.',
    metrics: [
      { label: 'Actividades completadas', value: '3', detail: 'María, esta semana', icon: 'brain', tone: 'secondary' },
      { label: 'Constancia', value: 'Alta', detail: 'Respecto a su propio historial', icon: 'activity', tone: 'success' },
    ],
    insights: [{ title: 'Participación constante', description: 'La participación en actividades cognitivas se mantiene; no es una evaluación diagnóstica.', source: 'Índice VITALIA' }],
  },
  trends: {
    eyebrow: 'Evolución', title: 'Tendencias', description: 'Cambios respecto a la rutina de cada paciente.',
    insights: [
      { title: 'Actividad a la baja', description: 'Rosa registra 28 % menos actividad que su semana habitual.', source: 'VITALIA Prevent', tone: 'warning' },
      { title: 'Rutina estable', description: 'María mantiene su rutina de bienestar y medicación.', source: 'Firma VITALIA', tone: 'success' },
    ],
  },
  alerts: {
    eyebrow: 'Prioridades', title: 'Alertas relevantes', description: 'Solo alertas con relevancia clínica autorizada.',
    alerts: [
      { title: 'Toma omitida', description: 'María omitió una dosis de Metformina esta semana.', timestamp: 'Hace 2 días', severity: 'attention' },
      { title: 'Actividad reducida', description: 'Rosa redujo su actividad diaria en los últimos días.', timestamp: 'Hoy', severity: 'attention' },
    ],
  },
  reports: {
    eyebrow: 'Resúmenes', title: 'Reportes', description: 'Reportes periódicos para el seguimiento profesional.',
    tables: [{ caption: 'Reportes', columns: [{ key: 'report', label: 'Reporte' }, { key: 'patient', label: 'Paciente' }, { key: 'period', label: 'Periodo' }], rows: [
      { report: 'Adherencia y bienestar', patient: 'María Hernández', period: 'Septiembre 2026' },
      { report: 'Actividad y rutina', patient: 'Rosa Méndez', period: 'Septiembre 2026' },
    ] }],
  },
  history: {
    eyebrow: 'Registro', title: 'Historial', description: 'Eventos de seguimiento registrados (sin expediente clínico completo).',
    tables: [{ caption: 'Historial de seguimiento', columns: [{ key: 'date', label: 'Fecha' }, { key: 'patient', label: 'Paciente' }, { key: 'event', label: 'Evento' }], rows: [
      { date: '23 sep 2026', patient: 'María Hernández', event: 'Revisión de plan de medicamentos' },
      { date: '16 sep 2026', patient: 'Rosa Méndez', event: 'Llamada de acompañamiento' },
    ] }],
  },
};

import { WorkspacePageConfig } from '../../shared/components/workspace-page/workspace-page.models';

export const ADMIN_PAGES: Readonly<Record<string, WorkspacePageConfig>> = {
  settings: {
    eyebrow: 'Administración', title: 'Configuración', description: 'Parámetros generales de la plataforma.',
    notice: 'Solo lectura en esta fase: la configuración editable llegará con el backend.',
    tables: [{
      caption: 'Parámetros de la plataforma',
      columns: [{ key: 'parameter', label: 'Parámetro' }, { key: 'value', label: 'Valor' }, { key: 'status', label: 'Estado' }],
      rows: [
        { parameter: 'Autenticación', value: 'Modo demostración, preparado para Supabase Auth', status: 'Mock' },
        { parameter: 'Voz', value: 'FastAPI + Vosk español (modelo local es-0.42)', status: 'Local' },
        { parameter: 'Mapas', value: 'Leaflet + OpenStreetMap', status: 'Activo' },
        { parameter: 'Audio y transcripciones', value: 'No se guardan; solo viajan para transcribirse', status: 'Privacidad' },
        { parameter: 'Ubicación', value: 'Solo bajo demanda o durante una emergencia confirmada', status: 'Privacidad' },
        { parameter: 'Servicios de emergencia', value: 'Flujo simulado: no contacta servicios reales', status: 'Simulado' },
      ],
    }],
  },
};

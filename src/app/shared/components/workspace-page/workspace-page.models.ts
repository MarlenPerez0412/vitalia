import { CardTone } from '../../ui/card-shell/card-shell.component';
import { AlertCardSeverity } from '../../ui/cards/alert-card.component';
import { VitaliaIconName } from '../../ui/icon/vitalia-icon.component';
import { ResponsiveTableColumn, ResponsiveTableRow } from '../../ui/responsive-table/responsive-table.component';
import { StatusBadgeVariant } from '../../ui/status-badge/status-badge.component';

export interface WorkspaceMetric { label: string; value: string; detail?: string; icon?: VitaliaIconName; tone?: CardTone; }
export interface WorkspaceAlert { title: string; description: string; timestamp: string; severity: AlertCardSeverity; }
export interface WorkspacePerson { name: string; summary: string; lastContact: string; wellbeingLabel?: string; wellbeingTone?: StatusBadgeVariant; }
export interface WorkspaceTable { caption: string; columns: readonly ResponsiveTableColumn[]; rows: readonly ResponsiveTableRow[]; }
export interface WorkspaceInsight { title: string; description: string; source?: string; tone?: CardTone; }

/** Configuracion de una seccion de Care, Health o Admin con datos mock (se pasa en `data.page` de la ruta). */
export interface WorkspacePageConfig {
  eyebrow: string;
  title: string;
  description: string;
  notice?: string;
  metrics?: readonly WorkspaceMetric[];
  people?: readonly WorkspacePerson[];
  alerts?: readonly WorkspaceAlert[];
  tables?: readonly WorkspaceTable[];
  insights?: readonly WorkspaceInsight[];
}

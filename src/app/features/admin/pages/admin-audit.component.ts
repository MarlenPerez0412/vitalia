import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ResponsiveTableColumn, ResponsiveTableComponent, ResponsiveTableRow } from '../../../shared/ui/responsive-table/responsive-table.component';
import { AdminDirectoryService } from '../services/admin-directory.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, ResponsiveTableComponent],
  selector: 'app-admin-audit',
  template: `
    <section class="page">
      <app-page-header eyebrow="Administración" title="Auditoría" description="Registro de acciones administrativas. Incluye lo que hagas en esta sesión (sin persistencia)." />
      <app-responsive-table caption="Acciones registradas" [columns]="columns" [rows]="rows()" emptyMessage="Aún no hay acciones registradas." />
    </section>
  `,
  styleUrl: './admin-page.scss',
})
export class AdminAuditComponent {
  private readonly directory = inject(AdminDirectoryService);
  protected readonly columns: readonly ResponsiveTableColumn[] = [
    { key: 'when', label: 'Fecha' }, { key: 'actor', label: 'Actor' }, { key: 'action', label: 'Acción' }, { key: 'resource', label: 'Recurso' }, { key: 'detail', label: 'Detalle' },
  ];
  protected readonly rows = computed<readonly ResponsiveTableRow[]>(() => this.directory.audit().map((entry) => ({
    when: new Date(entry.occurredAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }),
    actor: entry.actorUserId, action: entry.action, resource: entry.resourceType, detail: entry.resourceId ?? '—',
  })));
}

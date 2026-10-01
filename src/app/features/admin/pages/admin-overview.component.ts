import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MetricCardComponent } from '../../../shared/ui/cards/metric-card.component';
import { ModuleTileComponent } from '../../../shared/ui/cards/module-tile.component';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { AdminDirectoryService } from '../services/admin-directory.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetricCardComponent, ModuleTileComponent, PageHeaderComponent, VitaliaIconComponent],
  selector: 'app-admin-overview',
  template: `
    <section class="page">
      <app-page-header eyebrow="Operación" title="Panel general" description="Gestión de usuarios, roles, permisos y auditoría con mínimo privilegio." />
      <p class="notice notice--info"><app-vitalia-icon name="shield" [size]="20" />Modo demostración: los cambios se guardan solo en memoria durante la sesión.</p>
      <div class="cards">
        <app-metric-card label="Usuarios activos" [value]="directory.activeUsers() + ' de ' + directory.users().length" detail="Cuentas de la plataforma" icon="users" />
        <app-metric-card label="Roles activos" [value]="'' + directory.activeRoles().length" detail="SENIOR, CAREGIVER, HEALTH, ADMIN" icon="shield" tone="secondary" />
        <app-metric-card label="Permisos definidos" [value]="'' + directory.permissions.length" detail="Catálogo de capacidades" icon="lock" tone="success" />
        <app-metric-card label="Eventos de auditoría" [value]="'' + directory.audit().length" detail="Incluye acciones de esta sesión" icon="clipboard" tone="warning" />
      </div>
      <div class="cards">
        <app-module-tile title="Usuarios" description="Alta, edición y activación." icon="users" color="blue" (opened)="go('/admin/users')" />
        <app-module-tile title="Roles" description="Roles de la plataforma." icon="shield" color="green" (opened)="go('/admin/roles')" />
        <app-module-tile title="Permisos" description="Matriz rol × permiso." icon="lock" color="lilac" (opened)="go('/admin/permissions')" />
        <app-module-tile title="Auditoría" description="Registro de acciones." icon="clipboard" color="yellow" (opened)="go('/admin/audit')" />
      </div>
    </section>
  `,
  styleUrl: './admin-page.scss',
})
export class AdminOverviewComponent {
  protected readonly directory = inject(AdminDirectoryService);
  private readonly router = inject(Router);
  protected go(path: string): void { void this.router.navigateByUrl(path); }
}

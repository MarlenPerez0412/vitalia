import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PermissionCode } from '../../../core/models/access.models';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ResponsiveTableColumn, ResponsiveTableComponent, ResponsiveTableRow } from '../../../shared/ui/responsive-table/responsive-table.component';
import { AdminDirectoryService } from '../services/admin-directory.service';

/** Matriz ROL x PERMISO (minimo privilegio). Reutiliza ResponsiveTable con una plantilla de celda. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, ResponsiveTableComponent, VitaliaIconComponent],
  selector: 'app-admin-permissions',
  template: `
    <section class="page">
      <app-page-header eyebrow="Administración" title="Permisos" description="Asigna capacidades a cada rol. El consentimiento de cada persona sigue prevaleciendo sobre el rol." />
      <p class="notice notice--info"><app-vitalia-icon name="lock" [size]="20" />ADMIN conserva «Gestionar permisos» para no perder el acceso a esta pantalla.</p>
      @if (feedback()) { <p class="notice" role="status"><app-vitalia-icon name="check" [size]="20" />{{ feedback() }}</p> }
      <app-responsive-table caption="Matriz de permisos por rol" [columns]="columns()" [rows]="rows" [cellTemplate]="cell" />
      <ng-template #cell let-row let-column="column" let-value="value">
        @if (column.key === 'permission') {
          <span class="permission"><strong>{{ row['label'] }}</strong><small>{{ row['code'] }}</small></span>
        } @else if (column.key === 'category') {
          {{ value }}
        } @else {
          <label class="matrix-cell" [title]="locked(column.key, row['code']) ? 'Permiso protegido' : ''">
            <input type="checkbox" [checked]="has(column.key, row['code'])" [disabled]="locked(column.key, row['code'])" (change)="toggle(column.key, row['code'], column.label, row['label'])" />
            <span class="sr-only">{{ column.label }}: {{ row['label'] }}</span>
          </label>
        }
      </ng-template>
    </section>
  `,
  styleUrl: './admin-page.scss',
})
export class AdminPermissionsComponent {
  private readonly directory = inject(AdminDirectoryService);
  protected readonly feedback = signal('');
  protected readonly columns = computed<readonly ResponsiveTableColumn[]>(() => [
    { key: 'permission', label: 'Permiso' },
    { key: 'category', label: 'Área' },
    ...this.directory.activeRoles().map((role) => ({ key: role.code, label: role.label, align: 'center' as const })),
  ]);
  protected readonly rows: readonly ResponsiveTableRow[] = this.directory.permissions.map((permission) => ({ code: permission.code, label: permission.label, category: permission.category, permission: permission.label }));

  protected has(role: string, code: PermissionCode): boolean { return this.directory.hasPermission(role, code); }
  protected locked(role: string, code: PermissionCode): boolean { return this.directory.isLocked(role, code); }

  protected toggle(role: string, code: PermissionCode, roleLabel: string, permissionLabel: string): void {
    const granted = this.has(role, code);
    this.directory.togglePermission(role, code);
    this.feedback.set(`${permissionLabel}: ${granted ? 'retirado de' : 'asignado a'} ${roleLabel}.`);
  }
}

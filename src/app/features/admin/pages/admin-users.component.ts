import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ROLE_LABELS } from '../../../core/models/access.models';
import { Role } from '../../../core/models/domain.models';
import { AppButtonComponent } from '../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ResponsiveTableColumn, ResponsiveTableComponent, ResponsiveTableRow } from '../../../shared/ui/responsive-table/responsive-table.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { AdminDirectoryService } from '../services/admin-directory.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, PageHeaderComponent, ReactiveFormsModule, ResponsiveTableComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-admin-users',
  template: `
    <section class="page">
      <app-page-header eyebrow="Administración" title="Usuarios" description="Alta, consulta, edición y activación de cuentas. Modo demostración: los cambios viven en memoria." />
      <div class="toolbar">
        <div class="v-field search">
          <label for="user-search">Buscar usuario</label>
          <input id="user-search" class="v-input" type="search" placeholder="Nombre o correo" [value]="query()" (input)="query.set($any($event.target).value)" />
        </div>
        <app-button icon="user" (pressed)="startCreate()">Nuevo usuario</app-button>
      </div>
      @if (feedback()) { <p class="notice" role="status"><app-vitalia-icon name="check" [size]="20" />{{ feedback() }}</p> }

      @if (editing(); as mode) {
        <form class="panel" [formGroup]="form" (ngSubmit)="save()" aria-labelledby="user-form-title" novalidate>
          <h2 id="user-form-title">{{ mode === 'new' ? 'Nuevo usuario' : 'Editar usuario' }}</h2>
          <div class="v-form-grid">
            <div class="v-field"><label for="user-name">Nombre</label><input id="user-name" class="v-input" formControlName="name" autocomplete="off" [attr.aria-invalid]="invalid('name')" />@if (invalid('name')) { <p class="field-error">Escribe el nombre.</p> }</div>
            <div class="v-field"><label for="user-email">Correo</label><input id="user-email" class="v-input" type="email" formControlName="email" autocomplete="off" [attr.aria-invalid]="invalid('email')" />@if (invalid('email')) { <p class="field-error">Escribe un correo válido.</p> }</div>
            <div class="v-field"><label for="user-phone">Teléfono</label><input id="user-phone" class="v-input" type="tel" formControlName="phone" placeholder="+52 55 0000 0000" [attr.aria-invalid]="invalid('phone')" />@if (invalid('phone')) { <p class="field-error">Usa solo números, espacios o guiones.</p> }</div>
            <div class="v-field"><label for="user-role">Rol</label>
              <select id="user-role" class="v-input" formControlName="role">@for (role of directory.activeRoles(); track role.code) { <option [value]="role.code">{{ role.label }}</option> }</select>
            </div>
            <label class="check"><input type="checkbox" formControlName="active" /><span>Cuenta activa</span></label>
          </div>
          <div class="actions"><app-button type="submit" icon="check">Guardar</app-button><app-button variant="ghost" (pressed)="editing.set(null)">Cancelar</app-button></div>
        </form>
      }

      <app-responsive-table caption="Usuarios registrados" [columns]="columns" [rows]="rows()" [cellTemplate]="cell" emptyMessage="No hay usuarios que coincidan con la búsqueda." />
      <ng-template #cell let-row let-column="column" let-value="value">
        @switch (column.key) {
          @case ('status') { <app-status-badge [variant]="row['active'] ? 'success' : 'attention'">{{ value }}</app-status-badge> }
          @case ('actions') {
            <div class="row-actions">
              <app-button variant="ghost" (pressed)="startEdit(row['id'])">Editar<span class="sr-only"> a {{ row['name'] }}</span></app-button>
              <app-button variant="ghost" (pressed)="toggle(row['id'])">{{ row['active'] ? 'Desactivar' : 'Activar' }}<span class="sr-only"> a {{ row['name'] }}</span></app-button>
            </div>
          }
          @default { {{ value ?? '—' }} }
        }
      </ng-template>
    </section>
  `,
  styleUrl: './admin-page.scss',
})
export class AdminUsersComponent {
  protected readonly directory = inject(AdminDirectoryService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly query = signal('');
  protected readonly feedback = signal('');
  /** `'new'`, el id del usuario en edicion o `null`. */
  protected readonly editing = signal<string | null>(null);
  private readonly submitted = signal(false);
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.pattern(/^\+?[\d\s-]{8,20}$/)],
    role: ['SENIOR', Validators.required],
    active: [true],
  });
  protected readonly columns: readonly ResponsiveTableColumn[] = [
    { key: 'name', label: 'Nombre' }, { key: 'email', label: 'Correo' }, { key: 'phone', label: 'Teléfono' },
    { key: 'role', label: 'Rol' }, { key: 'status', label: 'Estado' }, { key: 'actions', label: 'Acciones' },
  ];
  protected readonly rows = computed<readonly ResponsiveTableRow[]>(() => {
    const query = this.query().trim().toLowerCase();
    return this.directory.users()
      .filter((user) => !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
      .map((user) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: this.roleLabel(user.role), status: user.active ? 'Activo' : 'Inactivo', active: user.active, actions: '' }));
  });

  protected invalid(control: 'name' | 'email' | 'phone'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || this.submitted());
  }

  protected startCreate(): void {
    this.submitted.set(false);
    this.form.reset({ name: '', email: '', phone: '', role: 'SENIOR', active: true });
    this.editing.set('new');
  }

  protected startEdit(id: string): void {
    const user = this.directory.users().find((item) => item.id === id);
    if (!user) return;
    this.submitted.set(false);
    this.form.reset({ name: user.name, email: user.email, phone: user.phone, role: user.role, active: user.active });
    this.editing.set(id);
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const editing = this.editing();
    if (editing === 'new') { this.directory.createUser(value); this.feedback.set(`Se dio de alta a ${value.name}.`); }
    else if (editing) { this.directory.updateUser(editing, value); this.feedback.set(`Se actualizaron los datos de ${value.name}.`); }
    this.editing.set(null);
  }

  protected toggle(id: string): void {
    const user = this.directory.users().find((item) => item.id === id);
    if (!user) return;
    this.directory.toggleUser(id);
    this.feedback.set(`${user.name} quedó ${user.active ? 'desactivado' : 'activado'}.`);
  }

  private roleLabel(code: string): string {
    return this.directory.roles().find((role) => role.code === code)?.label ?? ROLE_LABELS[code as Role] ?? code;
  }
}

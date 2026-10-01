import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppButtonComponent } from '../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { AdminDirectoryService } from '../services/admin-directory.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, PageHeaderComponent, ReactiveFormsModule, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-admin-roles',
  template: `
    <section class="page">
      <app-page-header eyebrow="Administración" title="Roles" description="Roles activos de la plataforma. INSTITUTION queda reservado para una fase futura." />
      <div class="toolbar"><span></span><app-button icon="users" (pressed)="startCreate()">Nuevo rol</app-button></div>
      @if (feedback()) { <p class="notice" role="status"><app-vitalia-icon name="check" [size]="20" />{{ feedback() }}</p> }

      @if (editing(); as mode) {
        <form class="panel" [formGroup]="form" (ngSubmit)="save()" aria-labelledby="role-form-title" novalidate>
          <h2 id="role-form-title">{{ mode === 'new' ? 'Nuevo rol' : 'Editar rol ' + mode }}</h2>
          <div class="v-form-grid">
            <div class="v-field"><label for="role-label">Nombre</label><input id="role-label" class="v-input" formControlName="label" [attr.aria-invalid]="form.controls.label.invalid && form.controls.label.touched" /></div>
            <div class="v-field"><label for="role-description">Descripción</label><input id="role-description" class="v-input" formControlName="description" /></div>
          </div>
          <div class="actions"><app-button type="submit" icon="check">Guardar</app-button><app-button variant="ghost" (pressed)="editing.set(null)">Cancelar</app-button></div>
        </form>
      }

      <div class="cards">
        @for (role of directory.roles(); track role.code) {
          <article class="card" [attr.aria-label]="role.label">
            <div class="badges">
              <app-status-badge [variant]="role.active ? 'success' : 'attention'">{{ role.active ? 'Activo' : 'Inactivo' }}</app-status-badge>
              <app-status-badge [variant]="role.system ? 'pending' : 'normal'">{{ role.system ? 'Rol del sistema' : 'Personalizado' }}</app-status-badge>
            </div>
            <h2>{{ role.label }}</h2>
            <code>{{ role.code }}</code>
            <p>{{ role.description }}</p>
            <p>{{ (directory.matrix()[role.code] ?? []).length }} permisos asignados</p>
            <div class="actions">
              <app-button variant="ghost" (pressed)="startEdit(role.code)">Editar<span class="sr-only"> {{ role.label }}</span></app-button>
              <app-button variant="ghost" [disabled]="!directory.canToggleRole(role.code)" (pressed)="toggle(role.code)">{{ role.active ? 'Desactivar' : 'Activar' }}<span class="sr-only"> {{ role.label }}</span></app-button>
            </div>
            @if (!directory.canToggleRole(role.code)) { <small>ADMIN no puede desactivarse para no perder el acceso a la administración.</small> }
          </article>
        }
      </div>
    </section>
  `,
  styleUrl: './admin-page.scss',
})
export class AdminRolesComponent {
  protected readonly directory = inject(AdminDirectoryService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly editing = signal<string | null>(null);
  protected readonly feedback = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({ label: ['', Validators.required], description: [''] });

  protected startCreate(): void { this.form.reset({ label: '', description: '' }); this.editing.set('new'); }

  protected startEdit(code: string): void {
    const role = this.directory.roles().find((item) => item.code === code);
    if (!role) return;
    this.form.reset({ label: role.label, description: role.description });
    this.editing.set(code);
  }

  protected save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const editing = this.editing();
    if (editing === 'new') { const role = this.directory.createRole(value); this.feedback.set(`Se creó el rol ${role.label} (${role.code}).`); }
    else if (editing) { this.directory.updateRole(editing, value); this.feedback.set(`Se actualizó el rol ${value.label}.`); }
    this.editing.set(null);
  }

  protected toggle(code: string): void {
    const role = this.directory.roles().find((item) => item.code === code);
    if (!role) return;
    this.directory.toggleRole(code);
    this.feedback.set(`El rol ${role.label} quedó ${role.active ? 'desactivado' : 'activado'}.`);
  }
}

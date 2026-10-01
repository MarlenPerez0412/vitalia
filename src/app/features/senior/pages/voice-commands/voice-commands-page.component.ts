import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomVoiceAction } from '../../../../core/models/mock-database.models';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { ContactsService } from '../../services/contacts.service';
import { CustomVoiceCommandService } from '../../services/custom-voice-command.service';

const ACTION_LABELS: Record<CustomVoiceAction, string> = { CALL_CONTACT: 'Llamar a un contacto', OPEN_LOCATION: 'Abrir ubicación', OPEN_MEDICATIONS: 'Abrir medicamentos', OPEN_CALENDAR: 'Abrir calendario', OPEN_EMERGENCY: 'Abrir emergencia' };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-voice-commands-page',
  imports: [AppButtonComponent, ReactiveFormsModule, SeniorPageComponent, StatusBadgeComponent],
  template: `
    <app-senior-page eyebrow="Personalización segura" title="Mis comandos de voz" description="Crea frases propias usando únicamente acciones permitidas por VITALIA." backPath="/senior/settings">
      <app-button pageActions (pressed)="startCreate()">Nuevo comando</app-button>
      <div class="senior-page__notice senior-page__notice--warning"><p><strong>Las acciones externas siempre conservan su confirmación.</strong><span>Una frase personalizada no puede saltarse permisos, llamadas ni emergencias.</span></p></div>
      @if (editing()) { <form class="form senior-page__panel" [formGroup]="form" (ngSubmit)="save()"><h2>{{ editing() === 'new' ? 'Nuevo comando' : 'Editar comando' }}</h2><div class="v-form-grid">
        <div class="v-field"><label for="command-phrase">Frase</label><input id="command-phrase" class="v-input" formControlName="phrase" placeholder="Ej. tráeme a mi hija" /></div>
        <div class="v-field"><label for="command-action">Acción</label><select id="command-action" class="v-input" formControlName="action">@for (action of actions; track action) { <option [value]="action">{{ actionLabels[action] }}</option> }</select></div>
        @if (form.controls.action.value === 'CALL_CONTACT') { <div class="v-field"><label for="command-contact">Contacto</label><select id="command-contact" class="v-input" formControlName="targetId"><option value="">Selecciona</option>@for (contact of contacts.contacts(); track contact.id) { <option [value]="contact.id">{{ contact.name }}</option> }</select></div> }
        <label class="check"><input type="checkbox" formControlName="enabled" /> Comando activo</label>
      </div><div class="senior-page__actions"><app-button type="submit" icon="check">Guardar</app-button><app-button variant="ghost" (pressed)="editing.set(null)">Cancelar</app-button></div></form> }
      <div class="commands">@for (command of service.commands(); track command.id) { <article><div><app-status-badge [variant]="command.enabled ? 'success' : 'normal'">{{ command.enabled ? 'Activo' : 'Inactivo' }}</app-status-badge><h2>“LIA, {{ command.phrase }}”</h2><p>{{ actionLabels[command.action] }}@if (command.targetId) { · {{ contactName(command.targetId) }} }</p></div><div class="actions"><app-button variant="ghost" (pressed)="startEdit(command.id)">Editar</app-button><app-button variant="ghost" (pressed)="remove(command.id)">Eliminar</app-button></div></article> } @empty { <p>No has creado comandos personalizados.</p> }</div>
    </app-senior-page>
  `,
  styles: `:host{display:block}.form{display:grid;gap:var(--space-4)}.form h2{margin:0}.check{align-items:center;display:flex;gap:var(--space-2);min-height:var(--touch-target)}.commands{display:grid;gap:var(--space-3)}.commands article{align-items:center;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);display:flex;flex-wrap:wrap;gap:var(--space-3);justify-content:space-between;padding:var(--space-4)}.commands h2{font-size:var(--font-size-card-title);margin:var(--space-2) 0 0}.commands p{color:var(--color-text-muted);margin:0}.actions{display:flex;flex-wrap:wrap;gap:var(--space-2)}`,
})
export class VoiceCommandsPageComponent {
  protected readonly service = inject(CustomVoiceCommandService); protected readonly contacts = inject(ContactsService); private readonly formBuilder = inject(FormBuilder);
  protected readonly editing = signal<string | null>(null); protected readonly actions: readonly CustomVoiceAction[] = ['CALL_CONTACT', 'OPEN_LOCATION', 'OPEN_MEDICATIONS', 'OPEN_CALENDAR', 'OPEN_EMERGENCY']; protected readonly actionLabels = ACTION_LABELS;
  protected readonly form = this.formBuilder.nonNullable.group({ phrase: ['', [Validators.required, Validators.minLength(3)]], action: ['OPEN_CALENDAR' as CustomVoiceAction, Validators.required], targetId: [''], enabled: [true] });
  protected startCreate(): void { this.form.reset({ phrase: '', action: 'OPEN_CALENDAR', targetId: '', enabled: true }); this.editing.set('new'); }
  protected startEdit(id: string): void { const item = this.service.commands().find((command) => command.id === id); if (!item) return; this.form.reset({ phrase: item.phrase, action: item.action, targetId: item.targetId ?? '', enabled: item.enabled }); this.editing.set(id); }
  protected save(): void { if (this.form.invalid) { this.form.markAllAsTouched(); return; } const value = this.form.getRawValue(); if (value.action === 'CALL_CONTACT' && !value.targetId) { this.form.controls.targetId.setErrors({ required: true }); return; } const input = { phrase: value.phrase.trim(), action: value.action, ...(value.targetId ? { targetId: value.targetId } : {}), enabled: value.enabled }; const id = this.editing(); if (id === 'new') this.service.create(input); else if (id) this.service.update(id, input); this.editing.set(null); }
  protected remove(id: string): void { this.service.remove(id); }
  protected contactName(id: string): string { return this.contacts.contacts().find((item) => item.id === id)?.name ?? 'Contacto'; }
}

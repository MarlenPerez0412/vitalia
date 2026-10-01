import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { ContactCardComponent } from '../../../../shared/ui/cards/contact-card.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { CallContactDialogComponent } from '../../components/call-contact-dialog/call-contact-dialog.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { SeniorContact } from '../../models/senior.models';
import { ContactsService } from '../../services/contacts.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, CallContactDialogComponent, ContactCardComponent, ReactiveFormsModule, SeniorPageComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-family-page',
  template: `
    <app-senior-page eyebrow="Mi red de apoyo" title="Familia" description="Personas que autorizaste para acompañarte." backPath="/senior">
      <app-button pageActions icon="users" (pressed)="startCreate()">Agregar contacto</app-button>
      @if (feedback()) { <div class="senior-page__notice" role="status"><app-vitalia-icon name="check" /><p><strong>Acción simulada</strong><span>{{ feedback() }}</span></p></div> }
      @if (editing()) {
        <form class="contact-form senior-page__panel" [formGroup]="form" (ngSubmit)="save()">
          <h2>{{ editing() === 'new' ? 'Agregar contacto' : 'Editar contacto' }}</h2>
          <div class="v-form-grid">
            <div class="v-field"><label for="contact-name">Nombre</label><input id="contact-name" class="v-input" formControlName="name" /></div>
            <div class="v-field"><label for="contact-relationship">Parentesco</label><input id="contact-relationship" class="v-input" formControlName="relationship" /></div>
            <div class="v-field"><label for="contact-kind">Tipo de relación</label><select id="contact-kind" class="v-input" formControlName="relationshipKey"><option value="DAUGHTER">Hija</option><option value="SON">Hijo</option><option value="SPOUSE">Pareja</option><option value="SIBLING">Hermana/o</option><option value="CAREGIVER">Cuidador/a</option><option value="OTHER">Otro</option></select></div>
            <div class="v-field"><label for="contact-phone">Teléfono</label><input id="contact-phone" class="v-input" type="tel" formControlName="phone" /></div>
            <div class="v-field"><label for="contact-availability">Disponibilidad</label><input id="contact-availability" class="v-input" formControlName="availability" /></div>
            <div class="v-field"><label for="contact-photo">Foto (URL opcional)</label><input id="contact-photo" class="v-input" type="url" formControlName="photoUri" /></div>
            <label class="check"><input type="checkbox" formControlName="emergencyContact" /><span>Contacto de emergencia</span></label>
            <label class="check"><input type="checkbox" formControlName="primaryContact" /><span>Contacto principal</span></label>
          </div>
          <div class="senior-page__actions"><app-button type="submit" icon="check">Guardar</app-button><app-button variant="ghost" (pressed)="editing.set(null)">Cancelar</app-button></div>
        </form>
      }
      <div class="senior-page__grid">
        @for (contact of contacts(); track contact.id) {
          <div class="contact">
            @if (contact.primaryEmergency) { <app-status-badge variant="emergency">Contacto de emergencia</app-status-badge> }
            <app-contact-card [name]="contact.name" [relationship]="contact.relationship" [availability]="contact.availability" [showMessage]="true" (called)="calling.set(contact)" (messaged)="message(contact)" />
            <div class="contact__actions"><app-button variant="ghost" (pressed)="startEdit(contact.id)">Editar</app-button><app-button variant="ghost" (pressed)="remove(contact.id)">Desactivar</app-button></div>
          </div>
        }
      </div>
      <div class="senior-page__panel"><h2>Tu privacidad primero</h2><p>Tu red solo puede ver la información que autorizaste. Puedes cambiarlo desde Privacidad.</p></div>
      <app-call-contact-dialog [open]="!!calling()" [contact]="calling()" (closed)="calling.set(null)" />
    </app-senior-page>
  `,
  styles: `.contact, .contact-form { display: grid; gap: var(--space-3); min-width: 0; }.contact__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); padding-inline: var(--space-2); }.contact-form h2 { margin: 0; }.check { align-items: center; display: flex; gap: var(--space-2); min-height: var(--touch-target); }`,
})
export class FamilyPageComponent {
  private readonly service = inject(ContactsService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly contacts = this.service.contacts;
  protected readonly calling = signal<SeniorContact | null>(null);
  protected readonly feedback = signal('');
  protected readonly editing = signal<string | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required], relationship: ['', Validators.required], relationshipKey: ['OTHER' as SeniorContact['relationshipKey'], Validators.required], phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s-]{8,20}$/)]], availability: ['Disponible'], photoUri: [''], emergencyContact: [false], primaryContact: [false],
  });
  protected message(contact: SeniorContact): void { this.feedback.set(`El mensaje ficticio para ${contact.name.split(' ')[0]} quedó preparado.`); }
  protected startCreate(): void { this.form.reset({ name: '', relationship: '', relationshipKey: 'OTHER', phone: '', availability: 'Disponible', photoUri: '', emergencyContact: false, primaryContact: false }); this.editing.set('new'); }
  protected startEdit(id: string): void { const contact = this.service.record(id); if (!contact) return; this.form.reset({ name: contact.name, relationship: contact.relationship, relationshipKey: contact.relationshipKey, phone: contact.phone, availability: contact.availability, photoUri: contact.photoUri ?? '', emergencyContact: contact.emergencyContact, primaryContact: contact.primaryContact }); this.editing.set(id); }
  protected save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue(); const id = this.editing();
    const input = { name: value.name.trim(), relationship: value.relationship.trim(), relationshipKey: value.relationshipKey, phone: value.phone.trim(), availability: value.availability.trim(), emergencyContact: value.emergencyContact, primaryContact: value.primaryContact, ...(value.photoUri.trim() ? { photoUri: value.photoUri.trim() } : {}) };
    if (id === 'new') this.service.add(input); else if (id) this.service.update(id, input);
    this.feedback.set('Los datos del contacto quedaron guardados en esta demostración.'); this.editing.set(null);
  }
  protected remove(id: string): void { const contact = this.service.record(id); this.service.deactivate(id); this.feedback.set(`${contact?.name ?? 'El contacto'} quedó desactivado.`); }
}

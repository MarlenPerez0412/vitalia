import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ContactCardComponent } from '../../../../shared/ui/cards/contact-card.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { CallContactDialogComponent } from '../../components/call-contact-dialog/call-contact-dialog.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { SeniorContact } from '../../models/senior.models';
import { ContactsService } from '../../services/contacts.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CallContactDialogComponent, ContactCardComponent, SeniorPageComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-family-page',
  template: `
    <app-senior-page eyebrow="Mi red de apoyo" title="Familia" description="Personas que autorizaste para acompañarte." backPath="/senior">
      @if (feedback()) { <div class="senior-page__notice" role="status"><app-vitalia-icon name="check" /><p><strong>Acción simulada</strong><span>{{ feedback() }}</span></p></div> }
      <div class="senior-page__grid">
        @for (contact of contacts(); track contact.id) {
          <div class="contact">
            @if (contact.primaryEmergency) { <app-status-badge variant="emergency">Contacto de emergencia</app-status-badge> }
            <app-contact-card [name]="contact.name" [relationship]="contact.relationship" [availability]="contact.availability" [showMessage]="true" (called)="calling.set(contact)" (messaged)="message(contact)" />
          </div>
        }
      </div>
      <div class="senior-page__panel"><h2>Tu privacidad primero</h2><p>Tu red solo puede ver la información que autorizaste. Puedes cambiarlo desde Privacidad.</p></div>
      <app-call-contact-dialog [open]="!!calling()" [contact]="calling()" (closed)="calling.set(null)" />
    </app-senior-page>
  `,
  styles: `.contact { display: grid; gap: var(--space-2); min-width: 0; }`,
})
export class FamilyPageComponent {
  protected readonly contacts = inject(ContactsService).contacts;
  protected readonly calling = signal<SeniorContact | null>(null);
  protected readonly feedback = signal('');
  protected message(contact: SeniorContact): void { this.feedback.set(`El mensaje ficticio para ${contact.name.split(' ')[0]} quedó preparado.`); }
}

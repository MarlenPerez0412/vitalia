import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationEventsService } from '../../../../core/services/notification-events.service';
import { SharingConsentService } from '../../../../core/services/sharing-consent.service';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { ContactsService } from '../../services/contacts.service';

interface SharingOption { key: 'emergencies' | 'medications' | 'wellbeing' | 'continuousLocation'; label: string; description: string; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-privacy-page',
  template: `
    <app-senior-page eyebrow="Tú decides" title="Lo que comparto" description="Controla qué puede consultar cada persona de tu red." backPath="/senior/profile">
      @if (contact(); as contact) { <div class="person"><span aria-hidden="true">{{ initials(contact.name) }}</span><div><h2>{{ contact.name }}</h2><p>{{ contact.relationship }}</p></div></div> }
      <div class="sharing-list">
        @for (option of options; track option.key) {
          <div><span class="status" [class.off]="!sharing()[option.key]"><app-vitalia-icon [name]="sharing()[option.key] ? 'check' : 'close'" [size]="20" /></span><div><strong>{{ option.label }}</strong><p>{{ option.description }}</p></div><button type="button" role="switch" [attr.aria-checked]="sharing()[option.key]" [attr.aria-label]="'Compartir ' + option.label" [class.active]="sharing()[option.key]" (click)="toggle(option.key)"><span></span></button></div>
        }
      </div>
      <div class="senior-page__notice"><app-vitalia-icon name="shield" /><p><strong>Ubicación: solo durante emergencia</strong><span>No se comparte ubicación continua con Ana.</span></p></div>
    </app-senior-page>
  `,
  styleUrl: './privacy-page.component.scss',
})
export class PrivacyPageComponent {
  protected readonly contact = inject(ContactsService).primaryEmergencyContact;
  protected initials(name: string): string { return name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase(); }
  private readonly consent = inject(SharingConsentService);
  private readonly notificationEvents = inject(NotificationEventsService);
  protected readonly sharing = this.consent.preferences;
  protected readonly options: readonly SharingOption[] = [
    { key: 'emergencies', label: 'Emergencias', description: 'Avisos y eventos de ayuda.' },
    { key: 'medications', label: 'Medicamentos', description: 'Horarios y confirmaciones.' },
    { key: 'wellbeing', label: 'Bienestar', description: 'Resumen autorizado, no notas privadas.' },
    { key: 'continuousLocation', label: 'Ubicación continua', description: 'Seguimiento fuera de emergencias.' },
  ];
  protected toggle(key: SharingOption['key']): void { this.notificationEvents.sharingChanged(key, this.consent.toggle(key)); }
}

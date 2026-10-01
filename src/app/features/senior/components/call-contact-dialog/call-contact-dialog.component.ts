import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { PhoneService } from '../../../../core/services/phone.service';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { ConsentDialogComponent } from '../../../../shared/ui/consent-dialog/consent-dialog.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorContact } from '../../models/senior.models';

/**
 * Confirmacion de llamada a un contacto autorizado. La llamada nunca es silenciosa: solo el enlace `tel:`
 * que la persona pulsa abre el marcador. Si el equipo no puede llamar, se muestra el numero y "Copiar numero".
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, ConsentDialogComponent, VitaliaIconComponent],
  selector: 'app-call-contact-dialog',
  template: `
    @if (contact(); as contact) {
      <app-consent-dialog [open]="open()" icon="phone" [heading]="'Prepararé una llamada para ' + contact.name + '.'"
        [description]="'Se abrirá el marcador de tu teléfono con el número de tu ' + contact.relationship.toLowerCase() + '. Tú decides si llamas.'"
        dismissLabel="Cancelar" [customActions]="true" (dismissed)="close()">
        <div class="contact">
          <span class="avatar" aria-hidden="true">{{ initials() }}</span>
          <div><strong>{{ contact.name }}</strong><span>{{ contact.relationship }} · {{ contact.availability }}</span><span class="phone">{{ contact.phone }}</span></div>
        </div>
        @if (!canDial) {
          <div class="desktop">
            <p>Si este equipo no puede hacer llamadas, marca el número desde tu teléfono.</p>
            <app-button variant="ghost" icon="check" (pressed)="copy(contact.phone)">{{ copied() ? 'Número copiado' : 'Copiar número' }}</app-button>
            <span class="sr-only" role="status">{{ copied() ? 'Número copiado' : '' }}</span>
          </div>
        }
        <a dialogActions class="call" [href]="telHref()" (click)="called.emit(contact)"><app-vitalia-icon name="phone" [size]="20" /><span>Llamar a {{ firstName() }}</span></a>
      </app-consent-dialog>
    }
  `,
  styles: `
    :host { display: contents; }
    .contact { align-items: center; background: var(--color-surface-muted); border-radius: var(--radius-lg); display: flex; gap: var(--space-3); padding: var(--space-3); }
    .avatar { align-items: center; background: var(--color-module-family); border-radius: 50%; color: var(--color-text); display: inline-flex; flex: 0 0 3.25rem; font-weight: 850; height: 3.25rem; justify-content: center; }
    .contact div { display: grid; min-width: 0; }
    .contact span { color: var(--color-text-muted); }
    .contact .phone { color: var(--color-text); font-size: var(--font-size-card-title); font-variant-numeric: tabular-nums; font-weight: 850; }
    .desktop { display: grid; gap: var(--space-2); }
    .desktop p { color: var(--color-text-muted); margin: 0; }
    .call { align-items: center; background: var(--color-primary); border-radius: var(--radius-md); color: var(--color-on-primary); display: flex; font-weight: 800; gap: var(--space-2); justify-content: center; min-height: var(--touch-target); padding: .7rem 1.1rem; text-decoration: none; }
    .call:hover { background: var(--color-primary-hover); }
  `,
})
export class CallContactDialogComponent {
  private readonly phone = inject(PhoneService);
  readonly open = input(false);
  readonly contact = input<SeniorContact | null>(null);
  readonly closed = output<void>();
  readonly called = output<SeniorContact>();

  protected readonly canDial = this.phone.canDial();
  protected readonly copied = signal(false);
  protected readonly telHref = computed(() => { const contact = this.contact(); return contact ? this.phone.telHref(contact.phone) : ''; });
  protected readonly firstName = computed(() => this.contact()?.name.split(/\s+/)[0] ?? '');
  protected readonly initials = computed(() => (this.contact()?.name ?? '').split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase());

  protected async copy(phone: string): Promise<void> { this.copied.set(await this.phone.copy(phone)); }
  protected close(): void { this.copied.set(false); this.closed.emit(); }
}

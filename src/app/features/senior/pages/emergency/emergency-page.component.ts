import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMERGENCY_SOURCE_LABELS } from '../../../../core/models/emergency.models';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { ConsentDialogComponent } from '../../../../shared/ui/consent-dialog/consent-dialog.component';
import { VitaliaIconComponent, VitaliaIconName } from '../../../../shared/ui/icon/vitalia-icon.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { CallContactDialogComponent } from '../../components/call-contact-dialog/call-contact-dialog.component';
import { LocationCardComponent, locationFailureHint } from '../../components/location-card/location-card.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { EmergencyReason } from '../../models/senior.models';
import { EmergencyService } from '../../services/emergency.service';

interface ReasonOption { reason: EmergencyReason; icon: VitaliaIconName; }

/** Vista del flujo de emergencia. El estado vive en `EmergencyService`, compartido con LIA y los comandos de voz. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, CallContactDialogComponent, ConsentDialogComponent, LocationCardComponent, SeniorPageComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-emergency-page',
  template: `
    <app-senior-page eyebrow="Ayuda inmediata" title="Emergencia" description="Este flujo es una simulación: no contacta servicios reales." backPath="/senior">
      @if (step() === 'idle' || step() === 'selected') {
        <div class="sos-area">
          <button class="sos" type="button" [class.ready]="reason()" aria-describedby="sos-help" (click)="startCountdown()">
            <span class="sos__ring" aria-hidden="true"><app-vitalia-icon name="emergency" [size]="48" /></span>
            <strong>SOS</strong>
            <small id="sos-help">{{ reason() ? 'Pedir ayuda por: ' + reason() : 'Primero elige qué ocurre' }}</small>
          </button>
        </div>
        <section aria-labelledby="what-happens">
          <h2 id="what-happens">¿Qué está pasando?</h2>
          <div class="reasons">
            @for (option of reasons; track option.reason) {
              <button type="button" class="reason" [class.selected]="reason() === option.reason" [attr.aria-pressed]="reason() === option.reason" (click)="selectReason(option.reason)">
                <span class="reason__icon" aria-hidden="true"><app-vitalia-icon [name]="option.icon" [size]="26" /></span><span>{{ option.reason }}</span>
              </button>
            }
          </div>
        </section>
        <div class="voice-hint">
          <span class="voice-hint__icon" aria-hidden="true"><app-vitalia-icon name="microphone" [size]="24" /></span>
          <p><strong>También puedes decir:</strong><span>«LIA, necesito ayuda»</span></p>
        </div>
        <p class="contact-note"><app-vitalia-icon name="users" [size]="18" /> Se avisará a {{ contactLabel() }} de forma simulada.</p>
      } @else if (step() === 'countdown') {
        <div class="countdown">
          <span class="countdown__number" aria-hidden="true">{{ countdown() }}</span>
          <h2 role="alert">{{ autoConfirm() ? 'Voy a iniciar la solicitud de ayuda. Puedes cancelar.' : 'La ayuda se preparará' }}</h2>
          <p aria-live="polite">{{ autoConfirm() ? 'Comenzará en ' + countdown() + (countdown() === 1 ? ' segundo.' : ' segundos.') : 'Puedes cancelar si activaste el flujo por error.' }}</p>
          @if (source() !== 'BUTTON') { <app-status-badge variant="pending">{{ sourceLabel() }}</app-status-badge> }
        </div>
        <app-button variant="ghost" [block]="true" icon="close" (pressed)="cancel()">Cancelar</app-button>
      } @else if (step() === 'confirmed') {
        <div class="senior-page__notice senior-page__notice--danger"><app-vitalia-icon name="alert" /><p><strong>Confirma la emergencia</strong><span>{{ reason() }}. Al confirmar se preparará tu ubicación y se avisará a {{ contactLabel() }} (simulado).</span></p></div>
        <div class="senior-page__actions"><app-button variant="emergency" icon="emergency" (pressed)="confirm()">Confirmar emergencia</app-button><app-button variant="ghost" (pressed)="cancel()">Cancelar</app-button></div>
      } @else if (step() === 'locating') {
        <div class="progress-list" aria-live="polite"><div class="done"><app-vitalia-icon name="check" /><span><strong>Solicitud confirmada</strong><small>{{ reason() }}</small></span></div><div><app-vitalia-icon name="home" /><span><strong>{{ consentOpen() ? 'Esperando tu permiso de ubicación' : 'Buscando tu ubicación…' }}</strong><small>Solo durante este evento</small></span></div></div>
        <app-button variant="ghost" (pressed)="cancel()">Cancelar flujo</app-button>
      } @else if (step() === 'location-fallback') {
        <div class="senior-page__notice senior-page__notice--warning" role="alert"><app-vitalia-icon name="alert" /><p><strong>No pude obtener tu ubicación.</strong><span>{{ failureHint() }}</span></p></div>
        <div class="senior-page__actions">
          <app-button variant="secondary" (pressed)="useDemoLocation()">Usar ubicación de demostración</app-button>
          <app-button variant="ghost" (pressed)="retryLocation()">Intentar de nuevo</app-button>
          <app-button variant="ghost" (pressed)="continueWithoutLocation()">Continuar sin ubicación</app-button>
        </div>
        <app-button variant="ghost" (pressed)="cancel()">Cancelar flujo</app-button>
      } @else if (step() === 'contacted' || step() === 'shared') {
        <div class="progress-list" aria-live="polite"><div class="done"><app-vitalia-icon name="check" /><span><strong>Solicitud confirmada</strong><small>{{ reason() }}</small></span></div><div class="done"><app-vitalia-icon name="check" /><span><strong>{{ locationShareLabel() }}</strong><small>Solo durante este evento</small></span></div><div [class.done]="step() === 'shared'"><app-vitalia-icon [name]="step() === 'shared' ? 'check' : 'phone'" /><span><strong>Aviso a {{ contactLabel() }}</strong><small>Contacto completamente simulado</small></span></div></div>
        <app-button variant="ghost" (pressed)="cancel()">Cancelar flujo</app-button>
      } @else if (step() === 'registered') {
        <div class="complete" role="status"><span><app-vitalia-icon name="check" [size]="36" /></span><h2>Evento registrado</h2><p>Avisamos a {{ contactLabel() }} (simulado) y {{ locationShareSentence() }}.</p><app-status-badge>{{ sourceLabel() }}</app-status-badge></div>
        @if (resolvedLocation(); as location) { <app-location-card [location]="location" usage="Durante esta emergencia" /> }
        <div class="senior-page__actions">
          @if (contact(); as contact) { <app-button variant="secondary" icon="phone" (pressed)="callOpen.set(true)">Llamar a {{ contact.name.split(' ')[0] }}</app-button> }
          <app-button variant="ghost" (pressed)="goHome()">Volver al inicio</app-button>
        </div>
      } @else {
        <div class="senior-page__notice"><app-vitalia-icon name="check" /><p><strong>Flujo cancelado</strong><span>No se registró ningún evento.</span></p></div><app-button (pressed)="reset()">Volver a empezar</app-button>
      }

      <app-consent-dialog [open]="consentOpen()" icon="home"
        heading="¿Permites que VITALIA use tu ubicación?"
        description="Tu ubicación se utilizará solo cuando tú la solicites o durante una emergencia confirmada."
        note="No realizamos seguimiento continuo."
        confirmLabel="Permitir ubicación" dismissLabel="Ahora no"
        (confirmed)="acceptLocationConsent()" (dismissed)="declineLocationConsent()" />
      <app-call-contact-dialog [open]="callOpen()" [contact]="contact()" (closed)="callOpen.set(false)" />
    </app-senior-page>
  `,
  styleUrl: './emergency-page.component.scss',
})
export class EmergencyPageComponent {
  private readonly emergency = inject(EmergencyService);
  private readonly router = inject(Router);
  protected readonly step = this.emergency.step;
  protected readonly reason = this.emergency.reason;
  protected readonly countdown = this.emergency.countdown;
  protected readonly autoConfirm = this.emergency.autoConfirm;
  protected readonly source = this.emergency.source;
  protected readonly consentOpen = this.emergency.consentOpen;
  protected readonly resolvedLocation = this.emergency.resolvedLocation;
  protected readonly contact = this.emergency.contact;
  protected readonly callOpen = signal(false);
  protected readonly reasons: readonly ReasonOption[] = [
    { reason: 'Me siento mal', icon: 'heart' },
    { reason: 'Me caí', icon: 'alert' },
    { reason: 'Estoy mareada', icon: 'activity' },
    { reason: 'Otra emergencia', icon: 'emergency' },
  ];

  protected readonly failureHint = computed(() => locationFailureHint(this.emergency.failure()));
  protected readonly sourceLabel = computed(() => EMERGENCY_SOURCE_LABELS[this.source()]);
  protected readonly contactLabel = computed(() => { const contact = this.contact(); return contact ? `${contact.name} (${contact.relationship})` : 'tu red de apoyo'; });
  protected readonly locationShareLabel = computed(() => {
    const location = this.resolvedLocation();
    return !location ? 'Ubicación no compartida' : location.source === 'REAL' ? 'Tu ubicación real compartida' : 'Ubicación de demostración compartida';
  });
  protected readonly locationShareSentence = computed(() => {
    const location = this.resolvedLocation();
    return !location ? 'el evento se registró sin ubicación' : location.source === 'REAL' ? 'tu ubicación quedó asociada al evento' : 'la ubicación de demostración quedó asociada al evento';
  });

  constructor() {
    // Al volver a la pantalla tras un evento terminado se ofrece un SOS limpio; un flujo en curso se conserva.
    if (this.step() === 'registered' || this.step() === 'cancelled') this.emergency.reset();
  }

  protected selectReason(reason: EmergencyReason): void { this.emergency.selectReason(reason); }
  protected startCountdown(): void { this.emergency.startCountdown(); }
  protected confirm(): Promise<void> { return this.emergency.confirm(); }
  protected acceptLocationConsent(): Promise<void> { return this.emergency.acceptLocationConsent(); }
  protected declineLocationConsent(): void { this.emergency.declineLocationConsent(); }
  protected retryLocation(): Promise<void> { return this.emergency.retryLocation(); }
  protected useDemoLocation(): void { this.emergency.useDemoLocation(); }
  protected continueWithoutLocation(): void { this.emergency.continueWithoutLocation(); }
  protected cancel(): void { this.emergency.cancel(); }
  protected reset(): void { this.emergency.reset(); }
  protected goHome(): void { void this.router.navigateByUrl('/senior'); }
}

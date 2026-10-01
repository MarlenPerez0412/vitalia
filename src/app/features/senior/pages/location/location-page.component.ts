import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PhrasebookService } from '../../../../core/i18n/phrasebook.service';
import { LiaOutputService } from '../../../../core/services/lia-output.service';
import { LocationService } from '../../../../core/services/location.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { ConsentDialogComponent } from '../../../../shared/ui/consent-dialog/consent-dialog.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { LocationCardComponent, locationFailureHint } from '../../components/location-card/location-card.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, ConsentDialogComponent, LocationCardComponent, SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-location-page',
  template: `
    <app-senior-page eyebrow="Seguridad con consentimiento" title="Ubicación" description="Tu ubicación solo se consulta cuando tú lo pides o durante una emergencia confirmada." backPath="/senior/security">
      <div class="senior-page__notice"><app-vitalia-icon name="shield" /><p><strong>No vigilamos. Acompañamos.</strong><span>No realizamos seguimiento continuo ni guardamos tus coordenadas.</span></p></div>

      <div class="senior-page__actions" aria-live="polite">
        <app-button icon="home" [loading]="location.status() === 'requesting'" loadingLabel="Buscando tu ubicación…" (pressed)="requestLocation()">
          {{ location.position() ? 'Actualizar mi ubicación' : 'Obtener mi ubicación' }}
        </app-button>
        @if (location.position()) { <app-button variant="ghost" (pressed)="forget()">Olvidar ubicación</app-button> }
      </div>

      @if (failure()) {
        <div class="senior-page__notice senior-page__notice--warning" role="alert">
          <app-vitalia-icon name="alert" />
          <p><strong>No pude obtener tu ubicación.</strong><span>{{ failureHint() }}</span></p>
        </div>
        <div class="senior-page__actions">
          <app-button variant="secondary" (pressed)="useDemo()">Usar ubicación de demostración</app-button>
        </div>
      }

      @if (location.position(); as position) {
        <app-location-card [location]="position" />
      } @else if (!failure()) {
        <div class="senior-page__panel"><p>Pulsa «Obtener mi ubicación» para ver dónde estás en el mapa.</p></div>
      }

      <app-consent-dialog [open]="consentOpen()" icon="home"
        heading="¿Permites que VITALIA use tu ubicación?"
        description="Tu ubicación se utilizará solo cuando tú la solicites o durante una emergencia confirmada."
        note="No realizamos seguimiento continuo."
        confirmLabel="Permitir ubicación" dismissLabel="Ahora no"
        (confirmed)="acceptConsent()" (dismissed)="declineConsent()" />
    </app-senior-page>
  `,
})
export class LocationPageComponent {
  protected readonly location = inject(LocationService);
  private readonly permissions = inject(PermissionsService);
  private readonly output = inject(LiaOutputService);
  private readonly phrases = inject(PhrasebookService);
  protected readonly consentOpen = signal(false);
  private readonly declined = signal(false);
  /** La ubicacion se pidio a LIA: el resultado tambien se dice en voz alta. */
  private announce = false;

  constructor() {
    // "LIA, ¿dónde estoy?": la propia persona pidio su ubicacion por voz (tambien si la pantalla ya estaba abierta).
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => { if (params.has('solicitar')) void this.requestLocation(true); });
  }

  protected readonly failure = computed(() => {
    if (this.declined()) return 'declined' as const;
    // Una vez elegida la ubicacion demo el aviso ya cumplio su funcion.
    if (this.location.position()?.source === 'DEMO') return null;
    const status = this.location.status();
    return status === 'denied' || status === 'unavailable' || status === 'error' ? status : null;
  });
  protected readonly failureHint = computed(() => { const failure = this.failure(); return failure ? locationFailureHint(failure) : ''; });

  protected async requestLocation(byVoice = false): Promise<void> {
    this.declined.set(false);
    this.announce = byVoice;
    if (await this.permissions.needsExplanation('geolocation')) { this.consentOpen.set(true); return; }
    await this.locate();
  }

  protected async acceptConsent(): Promise<void> {
    this.permissions.markExplanationSeen('geolocation');
    this.consentOpen.set(false);
    await this.locate();
  }

  protected declineConsent(): void { this.consentOpen.set(false); this.declined.set(true); this.announce = false; }

  private async locate(): Promise<void> {
    const position = await this.location.getCurrentPosition();
    if (!this.announce) return;
    this.announce = false;
    // Si falla, la pantalla ofrece «Usar ubicación de demostración».
    this.output.deliver(this.phrases.t(position ? 'location.found' : 'location.failed'), { priority: 'HIGH' });
  }
  protected useDemo(): void { this.declined.set(false); this.location.getDemoPosition(); }
  protected forget(): void { this.declined.set(false); this.location.clear(); }
}

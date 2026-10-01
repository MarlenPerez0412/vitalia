import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMERGENCY_SOURCE_LABELS, EMERGENCY_TYPE_LABELS, EmergencyEventRecord } from '../../../core/models/emergency.models';
import { EmergencyRegistryService } from '../../../core/services/emergency-registry.service';
import { AppButtonComponent } from '../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/states/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

/** Emergencias de la sesion (registro en memoria compartido con Senior). Preparado para datos reales del backend. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, EmptyStateComponent, PageHeaderComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-care-emergencies',
  template: `
    <section class="page">
      <app-page-header eyebrow="Ayuda solicitada" title="Emergencias" description="Solicitudes de ayuda de las personas que acompañas. Flujo simulado: no se contactan servicios reales." />
      @for (event of events(); track event.id) {
        <article class="event" [attr.aria-label]="'Emergencia de ' + event.seniorName">
          <div class="event__head">
            <span class="event__icon" aria-hidden="true"><app-vitalia-icon name="emergency" [size]="24" /></span>
            <div><h2>{{ event.seniorName }} · {{ typeLabels[event.type] }}</h2><p>{{ event.reason }} · {{ time(event) }}</p></div>
            <app-status-badge variant="emergency">Registrada</app-status-badge>
          </div>
          <dl class="event__details">
            <div><dt>Origen</dt><dd>{{ sourceLabels[event.source] }}</dd></div>
            <div><dt>Contacto avisado</dt><dd>{{ event.contactName ? event.contactName + ' (' + event.contactRelationship + ') · simulado' : 'Sin contacto' }}</dd></div>
            <div><dt>Ubicación</dt><dd>{{ locationLabel(event) }}</dd></div>
          </dl>
          @if (event.latitude !== undefined) { <app-button variant="secondary" icon="map-pin" (pressed)="go('/care/location')">Ver ubicación autorizada</app-button> }
        </article>
      } @empty {
        <app-empty-state title="Sin emergencias en esta sesión" description="Cuando María solicite ayuda (botón, LIA o comando de voz) aparecerá aquí." icon="shield" />
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .page { display: grid; gap: var(--space-5); min-width: 0; }
    .event { background: var(--color-surface); border: 1px solid color-mix(in srgb, var(--color-emergency) 35%, transparent); border-left: .35rem solid var(--color-emergency); border-radius: var(--radius-xl); display: grid; gap: var(--space-4); padding: var(--space-5); }
    .event__head { align-items: center; display: flex; flex-wrap: wrap; gap: var(--space-3); }
    .event__head > div { flex: 1; min-width: 12rem; }
    .event__icon { align-items: center; background: var(--color-emergency-soft); border-radius: 50%; color: var(--color-emergency); display: inline-flex; height: 3rem; justify-content: center; width: 3rem; }
    h2 { font-size: var(--font-size-card-title); margin: 0; }
    .event__head p { color: var(--color-text-muted); margin: 0; }
    .event__details { display: grid; gap: var(--space-2); margin: 0; }
    .event__details > div { display: grid; gap: var(--space-1) var(--space-4); grid-template-columns: minmax(0, 1fr); }
    dt { color: var(--color-text-muted); font-weight: 700; }
    dd { font-weight: 750; margin: 0; }
    @media (min-width: 40rem) { .event__details > div { grid-template-columns: 11rem minmax(0, 1fr); } }
  `,
})
export class CareEmergenciesComponent {
  private readonly router = inject(Router);
  protected readonly events = inject(EmergencyRegistryService).events;
  protected readonly typeLabels = EMERGENCY_TYPE_LABELS;
  protected readonly sourceLabels = EMERGENCY_SOURCE_LABELS;
  protected time(event: EmergencyEventRecord): string { return new Date(event.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }); }
  protected locationLabel(event: EmergencyEventRecord): string {
    if (event.latitude === undefined) return 'No se compartió';
    const accuracy = event.accuracy ? ` · ± ${Math.round(event.accuracy)} m` : '';
    return `${event.locationSource === 'REAL' ? 'GPS real' : 'Ubicación de demostración'}${accuracy}`;
  }
  protected go(path: string): void { void this.router.navigateByUrl(path); }
}

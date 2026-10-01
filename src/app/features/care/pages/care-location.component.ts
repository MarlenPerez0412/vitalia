import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EmergencyRegistryService } from '../../../core/services/emergency-registry.service';
import { MapComponent } from '../../../shared/components/map/map.component';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/states/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

/** "No vigilamos. Acompañamos.": la ubicacion solo existe si se compartio durante una emergencia confirmada. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, MapComponent, PageHeaderComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-care-location',
  template: `
    <section class="page">
      <app-page-header eyebrow="Con consentimiento" title="Ubicación autorizada" description="Solo se muestra la ubicación compartida durante una emergencia confirmada. No hay seguimiento continuo." />
      @if (shared(); as event) {
        <app-map [latitude]="event.latitude!" [longitude]="event.longitude!" [accuracy]="event.accuracy ?? null" [label]="'Ubicación de ' + event.seniorName + ' durante la emergencia'" />
        <dl class="details">
          <div><dt>Persona</dt><dd>{{ event.seniorName }}</dd></div>
          <div><dt>Origen</dt><dd><app-status-badge [variant]="event.locationSource === 'REAL' ? 'success' : 'attention'">{{ event.locationSource === 'REAL' ? 'GPS real' : 'Ubicación demo' }}</app-status-badge></dd></div>
          <div><dt>Precisión aproximada</dt><dd>{{ event.accuracy ? '± ' + round(event.accuracy) + ' m' : 'No disponible' }}</dd></div>
          <div><dt>Hora</dt><dd>{{ time(event.createdAt) }}</dd></div>
        </dl>
      } @else {
        <app-empty-state title="No hay ubicación compartida" description="La ubicación de María solo se comparte contigo durante una emergencia que ella confirma." icon="map-pin" />
      }
      <p class="note"><app-vitalia-icon name="shield" [size]="18" /> No vigilamos. Acompañamos.</p>
    </section>
  `,
  styles: `
    :host { display: block; }
    .page { display: grid; gap: var(--space-5); min-width: 0; }
    .details { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); margin: 0; padding: var(--space-2) var(--space-5); }
    .details > div { border-bottom: 1px solid var(--color-border); display: grid; gap: var(--space-1) var(--space-4); grid-template-columns: minmax(0, 1fr); padding: var(--space-3) 0; }
    .details > div:last-child { border-bottom: 0; }
    dt { color: var(--color-text-muted); font-weight: 700; }
    dd { font-weight: 750; margin: 0; }
    .note { align-items: center; color: var(--color-primary); display: flex; font-weight: 800; gap: var(--space-2); margin: 0; }
    @media (min-width: 40rem) { .details > div { grid-template-columns: 12rem minmax(0, 1fr); } }
  `,
})
export class CareLocationComponent {
  private readonly events = inject(EmergencyRegistryService).events;
  protected readonly shared = computed(() => this.events().find((event) => event.latitude !== undefined && event.longitude !== undefined) ?? null);
  protected round(value: number): number { return Math.round(value); }
  protected time(value: string): string { return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }); }
}

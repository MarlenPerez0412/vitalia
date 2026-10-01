import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LocationStatus, VitaliaLocation } from '../../../../core/models/location.models';
import { DEMO_LOCATION } from '../../../../core/services/senior-mock-data';
import { MapComponent } from '../../../../shared/components/map/map.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';

/** Mapa + detalle de una ubicacion puntual (GPS real o demo). Reutilizado por Ubicacion y Emergencia. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapComponent, StatusBadgeComponent],
  selector: 'app-location-card',
  template: `
    <app-map [latitude]="location().latitude" [longitude]="location().longitude" [accuracy]="location().accuracy" [label]="label()" />
    <div class="senior-page__panel">
      <dl class="senior-page__detail-list">
        <div><dt>Marcador</dt><dd>{{ label() }}</dd></div>
        <div><dt>Origen</dt><dd><app-status-badge [variant]="isReal() ? 'success' : 'attention'">{{ isReal() ? 'GPS real' : 'Ubicación demo' }}</app-status-badge></dd></div>
        <div><dt>Precisión aproximada</dt><dd>{{ accuracyLabel() }}</dd></div>
        <div><dt>Actualización</dt><dd>{{ updatedLabel() }}</dd></div>
        <div><dt>Uso autorizado</dt><dd>{{ usage() }}</dd></div>
      </dl>
    </div>
  `,
  styles: `:host { display: grid; gap: var(--space-4); min-width: 0; }`,
})
export class LocationCardComponent {
  readonly location = input.required<VitaliaLocation>();
  readonly usage = input('Solo cuando tú la solicitas');

  protected readonly isReal = computed(() => this.location().source === 'REAL');
  protected readonly label = computed(() => this.isReal() ? 'Ubicación actual' : DEMO_LOCATION.label);
  protected readonly accuracyLabel = computed(() => {
    const accuracy = this.location().accuracy;
    return accuracy ? `± ${Math.round(accuracy)} m` : 'No disponible';
  });
  protected readonly updatedLabel = computed(() =>
    new Date(this.location().timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
}

/** Texto de ayuda comun para los fallos de ubicacion. */
export function locationFailureHint(status: LocationStatus | 'declined'): string {
  switch (status) {
    case 'declined': return 'Decidiste no compartir tu ubicación por ahora.';
    case 'denied': return 'El permiso de ubicación está bloqueado. Puedes habilitarlo en la configuración del navegador.';
    case 'unavailable': return 'Este dispositivo o navegador no pudo determinar tu ubicación.';
    default: return 'La búsqueda tardó demasiado o falló. Puedes intentarlo de nuevo.';
  }
}

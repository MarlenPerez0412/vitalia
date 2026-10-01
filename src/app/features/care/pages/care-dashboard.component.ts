import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { EMERGENCY_SOURCE_LABELS, EMERGENCY_TYPE_LABELS } from '../../../core/models/emergency.models';
import { EmergencyRegistryService } from '../../../core/services/emergency-registry.service';
import { AppButtonComponent } from '../../../shared/ui/button/app-button.component';
import { AlertCardComponent } from '../../../shared/ui/cards/alert-card.component';
import { MetricCardComponent } from '../../../shared/ui/cards/metric-card.component';
import { SeniorCardComponent } from '../../../shared/ui/cards/senior-card.component';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertCardComponent, AppButtonComponent, MetricCardComponent, PageHeaderComponent, SeniorCardComponent, VitaliaIconComponent],
  selector: 'app-care-dashboard',
  template: `
    <section class="dashboard">
      <app-page-header eyebrow="Red de cuidado" [title]="'Hola, ' + firstName()" description="Así están hoy las personas que acompañas." />
      @if (latest(); as event) {
        <div class="emergency" role="alert">
          <app-vitalia-icon name="emergency" [size]="28" />
          <p><strong>{{ event.seniorName }} solicitó ayuda: {{ typeLabel() }}</strong><span>{{ timeLabel() }} · {{ sourceLabel() }} · {{ event.locationSource ? 'con ubicación' : 'sin ubicación' }} (simulado)</span></p>
          <app-button variant="emergency" (pressed)="go('/care/emergencies')">Ver emergencia</app-button>
        </div>
      }
      <div class="grid grid--metrics">
        <app-metric-card label="Bienestar de María" value="Estable" detail="Check-in de hoy: se siente bien" icon="heart" tone="success" />
        <app-metric-card label="Medicamentos de hoy" value="1 de 4" detail="Metformina pendiente 10:00 AM" icon="pill" tone="warning" />
        <app-metric-card label="Emergencias en la sesión" [value]="'' + events().length" [detail]="events().length ? 'Revisa la sección Emergencias' : 'Sin eventos'" icon="emergency" [tone]="events().length ? 'danger' : 'primary'" />
      </div>
      <div class="grid">
        <app-senior-card name="María Hernández" summary="73 años · Bienestar estable y plan casi completo." lastContact="Hoy, 9:10 AM" (selected)="go('/care/people')" />
        <app-alert-card title="Toma pendiente" description="Metformina de las 10:00 AM aún no está confirmada." timestamp="Hace 20 minutos" severity="attention" (reviewed)="go('/care/alerts')" />
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .dashboard { display: grid; gap: var(--space-6); min-width: 0; }
    .grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); }
    .grid--metrics { grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); }
    .emergency { align-items: center; background: var(--color-emergency-soft); border: 2px solid var(--color-emergency); border-radius: var(--radius-xl); color: var(--color-emergency); display: flex; flex-wrap: wrap; gap: var(--space-3); padding: var(--space-4); }
    .emergency p { flex: 1; margin: 0; min-width: 14rem; }
    .emergency strong, .emergency span { display: block; }
    .emergency span { color: var(--color-text-muted); }
  `,
})
export class CareDashboardComponent {
  private readonly router = inject(Router);
  private readonly registry = inject(EmergencyRegistryService);
  private readonly auth = inject(AuthService);
  protected readonly events = this.registry.events;
  protected readonly latest = this.registry.latest;
  protected readonly firstName = computed(() => this.auth.currentUser()?.displayName.split(' ')[0] ?? '');
  protected readonly typeLabel = computed(() => { const event = this.latest(); return event ? EMERGENCY_TYPE_LABELS[event.type] : ''; });
  protected readonly sourceLabel = computed(() => { const event = this.latest(); return event ? EMERGENCY_SOURCE_LABELS[event.source] : ''; });
  protected readonly timeLabel = computed(() => { const event = this.latest(); return event ? new Date(event.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''; });
  protected go(path: string): void { void this.router.navigateByUrl(path); }
}

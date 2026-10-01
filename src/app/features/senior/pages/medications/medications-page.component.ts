import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { MedicationCardComponent } from '../../../../shared/ui/cards/medication-card.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { StatusBadgeVariant } from '../../../../shared/ui/status-badge/status-badge.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { MedicationDemo, MedicationDemoStatus, MedicationPeriod } from '../../models/senior.models';
import { SeniorStateService } from '../../services/senior-state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, MedicationCardComponent, SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-medications-page',
  template: `
    <app-senior-page eyebrow="Mi plan" title="Medicamentos" description="Horarios claros para mañana, tarde y noche." backPath="/senior/health">
      <app-button pageActions variant="ghost" (pressed)="openHistory()">Ver historial</app-button>
      @if (state.lastFeedback()) { <div class="senior-page__notice" role="status"><app-vitalia-icon name="check" /><p><strong>Listo</strong><span>{{ state.lastFeedback() }}</span></p></div> }
      @for (period of periods; track period.key) {
        <section class="timeline" [attr.aria-labelledby]="period.key">
          <div class="period-heading"><span aria-hidden="true">{{ period.symbol }}</span><div><h2 [id]="period.key">{{ period.label }}</h2><p>{{ period.detail }}</p></div></div>
          <div class="senior-page__grid">
            @for (medication of medicationsFor(period.key); track medication.id) {
              <app-medication-card [name]="medication.name" [dose]="medication.dose" [time]="medication.time"
                [statusLabel]="statusLabel(medication.status)" [statusTone]="statusTone(medication.status)"
                [disabled]="medication.status === 'TAKEN'" [secondaryActionLabel]="medication.status === 'TAKEN' ? '' : 'Recordarme después'"
                (confirmed)="state.takeMedication(medication.id)" (postponed)="state.remindMedicationLater(medication.id)" />
            }
          </div>
        </section>
      }
    </app-senior-page>
  `,
  styleUrl: './medications-page.component.scss',
})
export class MedicationsPageComponent {
  protected readonly state = inject(SeniorStateService);
  protected readonly periods: readonly { key: MedicationPeriod; label: string; detail: string; symbol: string }[] = [
    { key: 'MORNING', label: 'Mañana', detail: '6:00 AM a 12:00 PM', symbol: '☀' },
    { key: 'AFTERNOON', label: 'Tarde', detail: '12:00 PM a 7:00 PM', symbol: '◐' },
    { key: 'NIGHT', label: 'Noche', detail: 'Después de las 7:00 PM', symbol: '☾' },
  ];
  private readonly router = inject(Router);

  protected medicationsFor(period: MedicationPeriod): readonly MedicationDemo[] { return this.state.medications().filter((item) => item.period === period); }
  protected statusLabel(status: MedicationDemoStatus): string { return { TAKEN: 'Tomado', PENDING: 'Pendiente', UPCOMING: 'Próximo' }[status]; }
  protected statusTone(status: MedicationDemoStatus): StatusBadgeVariant { return { TAKEN: 'success', PENDING: 'pending', UPCOMING: 'normal' }[status] as StatusBadgeVariant; }
  protected openHistory(): void { void this.router.navigateByUrl('/senior/medications/history'); }
}

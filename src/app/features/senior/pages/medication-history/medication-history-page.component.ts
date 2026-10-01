import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ResponsiveTableColumn, ResponsiveTableComponent, ResponsiveTableRow } from '../../../../shared/ui/responsive-table/responsive-table.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { SeniorStateService } from '../../services/senior-state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResponsiveTableComponent, SeniorPageComponent],
  selector: 'app-medication-history-page',
  template: `<app-senior-page eyebrow="Registro personal" title="Historial de medicamentos" description="Tomas recientes guardadas en esta demostración." backPath="/senior/medications"><app-responsive-table caption="Tomas recientes" [columns]="columns" [rows]="rows()" /></app-senior-page>`,
})
export class MedicationHistoryPageComponent {
  private readonly state = inject(SeniorStateService);
  protected readonly columns: readonly ResponsiveTableColumn[] = [
    { key: 'medication', label: 'Medicamento' }, { key: 'dose', label: 'Dosis' }, { key: 'scheduledTime', label: 'Programado' },
    { key: 'recordedAt', label: 'Registrado' }, { key: 'status', label: 'Estado', align: 'end' },
  ];
  protected readonly rows = computed<readonly ResponsiveTableRow[]>(() => this.state.medicationHistory().map((entry) => ({ ...entry })));
}

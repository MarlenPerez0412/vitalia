import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [AppButtonComponent, MedicationCardComponent, ReactiveFormsModule, SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-medications-page',
  template: `
    <app-senior-page eyebrow="Mi plan" title="Medicamentos" description="Horarios claros para mañana, tarde y noche." backPath="/senior/health">
      <div pageActions class="page-actions"><app-button icon="pill" (pressed)="startCreate()">Agregar</app-button><app-button variant="ghost" (pressed)="openHistory()">Ver historial</app-button></div>
      @if (state.lastFeedback()) { <div class="senior-page__notice" role="status"><app-vitalia-icon name="check" /><p><strong>Listo</strong><span>{{ state.lastFeedback() }}</span></p></div> }
      @if (editing()) {
        <form class="medication-form senior-page__panel" [formGroup]="form" (ngSubmit)="save()" novalidate>
          <h2>{{ editing() === 'new' ? 'Agregar medicamento' : 'Editar medicamento' }}</h2>
          <div class="v-form-grid">
            <div class="v-field"><label for="med-name">Nombre</label><input id="med-name" class="v-input" formControlName="name" /></div>
            <div class="v-field"><label for="med-dose">Dosis</label><input id="med-dose" class="v-input" formControlName="dose" placeholder="Ej. 50 mg" /></div>
            <div class="v-field"><label for="med-route">Vía de administración</label><input id="med-route" class="v-input" formControlName="administrationRoute" /></div>
            <div class="v-field"><label for="med-time">Horario</label><input id="med-time" class="v-input" type="time" formControlName="time" /></div>
            <div class="v-field"><label for="med-instructions">Indicaciones</label><input id="med-instructions" class="v-input" formControlName="instructions" /></div>
            <div class="v-field"><label for="med-remaining">Cantidad restante</label><input id="med-remaining" class="v-input" type="number" min="0" formControlName="remainingQuantity" /></div>
            <div class="v-field"><label for="med-refill">Intervalo de resurtido (días)</label><input id="med-refill" class="v-input" type="number" min="1" formControlName="refillInterval" /></div>
            <div class="v-field"><label for="med-reason">Motivo</label><input id="med-reason" class="v-input" formControlName="reason" /></div>
            <div class="v-field"><label for="med-photo">Foto (URL opcional)</label><input id="med-photo" class="v-input" type="url" formControlName="photoUri" /></div>
          </div>
          @if (form.invalid && submitted()) { <p class="form-error" role="alert">Revisa nombre, dosis, horario y cantidades.</p> }
          <div class="senior-page__actions"><app-button type="submit" icon="check">Guardar</app-button><app-button variant="ghost" (pressed)="cancelEdit()">Cancelar</app-button></div>
        </form>
      }
      @for (period of periods; track period.key) {
        <section class="timeline" [attr.aria-labelledby]="period.key">
          <div class="period-heading"><span aria-hidden="true">{{ period.symbol }}</span><div><h2 [id]="period.key">{{ period.label }}</h2><p>{{ period.detail }}</p></div></div>
          <div class="senior-page__grid">
            @for (medication of medicationsFor(period.key); track medication.id) {
              <div class="medication-management">
                <app-medication-card [name]="medication.name" [dose]="medication.dose" [time]="medication.time"
                  [statusLabel]="statusLabel(medication.status)" [statusTone]="statusTone(medication.status)"
                  [disabled]="medication.status === 'TAKEN'" [secondaryActionLabel]="medication.status === 'TAKEN' ? '' : 'Recordarme después'"
                  (confirmed)="state.takeMedication(medication.id)" (postponed)="state.remindMedicationLater(medication.id)"
                  [tertiaryActionLabel]="medication.status === 'PENDING' ? 'Omitir' : ''" (skipped)="state.skipMedication(medication.id)" />
                <div class="manage-actions"><app-button variant="ghost" (pressed)="startEdit(medication.id)">Editar</app-button><app-button variant="ghost" (pressed)="finish(medication.id)">Finalizar tratamiento</app-button></div>
              </div>
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
  private readonly formBuilder = inject(FormBuilder);
  protected readonly editing = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required], dose: ['', Validators.required], administrationRoute: ['Oral', Validators.required], time: ['08:00', Validators.required],
    instructions: [''], remainingQuantity: [0, [Validators.required, Validators.min(0)]], refillInterval: [30, [Validators.required, Validators.min(1)]], reason: [''], photoUri: [''],
  });
  protected readonly periods: readonly { key: MedicationPeriod; label: string; detail: string; symbol: string }[] = [
    { key: 'MORNING', label: 'Mañana', detail: '6:00 AM a 12:00 PM', symbol: '☀' },
    { key: 'AFTERNOON', label: 'Tarde', detail: '12:00 PM a 7:00 PM', symbol: '◐' },
    { key: 'NIGHT', label: 'Noche', detail: 'Después de las 7:00 PM', symbol: '☾' },
  ];
  private readonly router = inject(Router);

  protected medicationsFor(period: MedicationPeriod): readonly MedicationDemo[] { return this.state.medications().filter((item) => item.period === period); }
  protected statusLabel(status: MedicationDemoStatus): string { return { TAKEN: 'Tomado', PENDING: 'Pendiente', UPCOMING: 'Próximo', SKIPPED: 'Omitido' }[status]; }
  protected statusTone(status: MedicationDemoStatus): StatusBadgeVariant { return { TAKEN: 'success', PENDING: 'pending', UPCOMING: 'normal', SKIPPED: 'attention' }[status] as StatusBadgeVariant; }
  protected openHistory(): void { void this.router.navigateByUrl('/senior/medications/history'); }
  protected startCreate(): void { this.submitted.set(false); this.form.reset({ name: '', dose: '', administrationRoute: 'Oral', time: '08:00', instructions: '', remainingQuantity: 0, refillInterval: 30, reason: '', photoUri: '' }); this.editing.set('new'); }
  protected startEdit(id: string): void {
    const medication = this.state.medicationRecords().find((item) => item.id === id); if (!medication) return;
    this.submitted.set(false); this.form.reset({ name: medication.name, dose: medication.dose, administrationRoute: medication.administrationRoute, time: medication.schedule[0] ?? '08:00', instructions: medication.instructions, remainingQuantity: medication.remainingQuantity, refillInterval: medication.refillInterval, reason: medication.reason, photoUri: medication.photoUri ?? '' }); this.editing.set(id);
  }
  protected cancelEdit(): void { this.editing.set(null); }
  protected save(): void {
    this.submitted.set(true); if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue(); const current = this.editing();
    const input = { name: value.name.trim(), dose: value.dose.trim(), administrationRoute: value.administrationRoute.trim(), schedule: [value.time], instructions: value.instructions.trim(), remainingQuantity: value.remainingQuantity, refillInterval: value.refillInterval, reason: value.reason.trim(), ...(value.photoUri.trim() ? { photoUri: value.photoUri.trim() } : {}), active: true };
    if (current === 'new') this.state.addMedication(input); else if (current) this.state.updateMedication(current, input);
    this.editing.set(null);
  }
  protected finish(id: string): void { this.state.deactivateMedication(id); if (this.editing() === id) this.editing.set(null); }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DEMO_SENIOR_ID } from '../../../core/services/mock-database.service';
import { AppButtonComponent } from '../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ResponsiveTableComponent } from '../../../shared/ui/responsive-table/responsive-table.component';
import { HealthFollowUpService } from '../services/health-follow-up.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, PageHeaderComponent, ReactiveFormsModule, ResponsiveTableComponent, VitaliaIconComponent],
  selector: 'app-health-follow-up',
  template: `
    <section class="page">
      <app-page-header eyebrow="Plan de cuidado" title="Seguimiento de María Hernández" description="Registros profesionales autorizados; no constituyen un expediente clínico completo." />
      <div><app-button icon="clipboard" (pressed)="startCreate()">Registrar seguimiento</app-button></div>
      @if (feedback()) { <p class="notice" role="status"><app-vitalia-icon name="check" [size]="20" /><span>{{ feedback() }}</span></p> }
      @if (editing()) { <form class="panel" [formGroup]="form" (ngSubmit)="save()"><h2>{{ editing() === 'new' ? 'Nuevo seguimiento' : 'Editar seguimiento' }}</h2><div class="v-form-grid">
        <div class="v-field"><label for="follow-date">Fecha</label><input id="follow-date" class="v-input" type="date" formControlName="date" /></div>
        <div class="v-field"><label for="follow-type">Tipo</label><input id="follow-type" class="v-input" formControlName="type" /></div>
        <div class="v-field"><label for="follow-note">Nota</label><textarea id="follow-note" class="v-input" rows="3" formControlName="note"></textarea></div>
        <div class="v-field"><label for="follow-recommendation">Recomendación</label><textarea id="follow-recommendation" class="v-input" rows="3" formControlName="recommendation"></textarea></div>
        <div class="v-field"><label for="follow-review">Próxima revisión</label><input id="follow-review" class="v-input" type="date" formControlName="nextReview" /></div>
      </div><div class="actions"><app-button type="submit" icon="check">Guardar</app-button><app-button variant="ghost" (pressed)="editing.set(null)">Cancelar</app-button></div></form> }
      <app-responsive-table caption="Agenda de seguimiento" [columns]="columns" [rows]="rows()" />
      <div class="records">@for (record of service.records(); track record.id) { <article [class.inactive]="!record.active"><div><strong>{{ record.type }}</strong><span>{{ record.date }} · {{ record.active ? 'Activo' : 'Anulado' }}</span></div><p>{{ record.note }}</p>@if (record.recommendation) { <p><strong>Recomendación:</strong> {{ record.recommendation }}</p> }@if (record.nextReview) { <p>Próxima revisión: {{ record.nextReview }} · también visible en el calendario de María.</p> }@if (record.active) { <div class="actions"><app-button variant="ghost" (pressed)="startEdit(record.id)">Editar</app-button><app-button variant="ghost" (pressed)="deactivate(record.id)">Anular</app-button></div> }</article> }</div>
    </section>
  `,
  styles: `:host{display:block}.page,.panel,.records{display:grid;gap:var(--space-5);min-width:0}.notice{align-items:center;background:var(--color-success-soft);border-radius:var(--radius-lg);color:var(--color-success);display:flex;font-weight:700;gap:var(--space-2);margin:0;padding:var(--space-3) var(--space-4)}.panel,.records article{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-4)}.panel h2{margin:0}.actions{display:flex;flex-wrap:wrap;gap:var(--space-2)}.records article{display:grid;gap:var(--space-2)}.records article>div:first-child{display:flex;flex-wrap:wrap;gap:var(--space-2);justify-content:space-between}.records p{margin:0}.records span{color:var(--color-text-muted)}.records .inactive{opacity:.72}`,
})
export class HealthFollowUpComponent {
  protected readonly service = inject(HealthFollowUpService); private readonly formBuilder = inject(FormBuilder); protected readonly feedback = signal(''); protected readonly editing = signal<string | null>(null);
  protected readonly columns = [{ key: 'patient', label: 'Paciente' }, { key: 'task', label: 'Seguimiento' }, { key: 'date', label: 'Fecha' }];
  protected readonly rows = computed(() => this.service.entries().map(({ patient, task, date }) => ({ patient, task, date })));
  protected readonly form = this.formBuilder.nonNullable.group({ date: [this.today(), Validators.required], type: ['Control', Validators.required], note: ['', Validators.required], recommendation: [''], nextReview: [''] });
  protected startCreate(): void { this.form.reset({ date: this.today(), type: 'Control', note: '', recommendation: '', nextReview: '' }); this.editing.set('new'); }
  protected startEdit(id: string): void { const item = this.service.records().find((record) => record.id === id); if (!item) return; this.form.reset({ date: item.date, type: item.type, note: item.note, recommendation: item.recommendation, nextReview: item.nextReview ?? '' }); this.editing.set(id); }
  protected save(): void { if (this.form.invalid) { this.form.markAllAsTouched(); return; } const value = this.form.getRawValue(); const input = { seniorId: DEMO_SENIOR_ID, date: value.date, type: value.type.trim(), note: value.note.trim(), recommendation: value.recommendation.trim(), ...(value.nextReview ? { nextReview: value.nextReview } : {}) }; const id = this.editing(); if (id === 'new') this.service.create(input); else if (id) this.service.update(id, input); this.feedback.set('Seguimiento guardado. La próxima revisión se sincronizó con el calendario de María.'); this.editing.set(null); }
  protected deactivate(id: string): void { this.service.deactivate(id); this.feedback.set('El seguimiento quedó anulado; permanece en el historial.'); }
  private today(): string { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
}

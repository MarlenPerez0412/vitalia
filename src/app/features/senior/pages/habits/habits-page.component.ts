import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HabitCategory } from '../../../../core/models/mock-database.models';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { HabitsService } from '../../services/habits.service';

const CATEGORY_LABELS: Record<HabitCategory, string> = { HEALTH: 'Salud', WELLBEING: 'Bienestar', COGNITION: 'Cognición', PHYSICAL: 'Actividad física', PERSONAL: 'Personal', OTHER: 'Otra' };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-habits-page',
  imports: [AppButtonComponent, ReactiveFormsModule, SeniorPageComponent, StatusBadgeComponent],
  template: `
    <app-senior-page eyebrow="Mi rutina" title="Hábitos y actividades" description="Organiza actividades sencillas y conserva su historial." backPath="/senior">
      <app-button pageActions (pressed)="startCreate()">Agregar actividad</app-button>
      @if (feedback()) { <p class="notice" role="status">{{ feedback() }}</p> }
      @if (editing()) {
        <form class="panel senior-page__panel" [formGroup]="form" (ngSubmit)="save()">
          <h2>{{ editing() === 'new' ? 'Nueva actividad' : 'Editar actividad' }}</h2>
          <div class="v-form-grid">
            <div class="v-field"><label for="habit-name">Nombre</label><input id="habit-name" class="v-input" formControlName="name" /></div>
            <div class="v-field"><label for="habit-category">Categoría</label><select id="habit-category" class="v-input" formControlName="category">@for (item of categories; track item) { <option [value]="item">{{ categoryLabels[item] }}</option> }</select></div>
            <div class="v-field"><label for="habit-start">Hora de inicio</label><input id="habit-start" class="v-input" type="time" formControlName="startTime" /></div>
            <div class="v-field"><label for="habit-end">Hora de fin (opcional)</label><input id="habit-end" class="v-input" type="time" formControlName="endTime" /></div>
            <label class="check"><input type="checkbox" formControlName="active" /> Actividad activa</label>
          </div>
          <fieldset><legend>Días de la semana</legend><div class="days">@for (day of days; track day.value) { <label><input type="checkbox" [checked]="selectedDays().includes(day.value)" (change)="toggleDay(day.value)" />{{ day.label }}</label> }</div></fieldset>
          <div class="senior-page__actions"><app-button type="submit" icon="check">Guardar</app-button><app-button variant="ghost" (pressed)="editing.set(null)">Cancelar</app-button></div>
        </form>
      }
      <section aria-labelledby="today-activities"><h2 id="today-activities">Actividades pendientes del día</h2><div class="cards">
        @for (item of habits.today(); track item.habit.id) {
          <article class="activity">
            <div><app-status-badge [variant]="item.completion?.status === 'COMPLETED' ? 'success' : item.completion?.status === 'SKIPPED' ? 'attention' : 'pending'">{{ status(item.completion?.status) }}</app-status-badge><h3>{{ item.habit.name }}</h3><p>{{ categoryLabels[item.habit.category] }} · {{ item.habit.startTime }}</p></div>
            @if (!item.completion || item.completion.status === 'POSTPONED') {
              <div class="actions"><app-button (pressed)="complete(item.habit.id)">Realizado</app-button><app-button variant="secondary" (pressed)="postpone(item.habit.id, 15)">15 min</app-button><app-button variant="ghost" (pressed)="postpone(item.habit.id, 60)">1 hora</app-button><app-button variant="ghost" (pressed)="skip(item.habit.id)">Omitir</app-button></div>
            }
            <div class="manage"><app-button variant="ghost" (pressed)="startEdit(item.habit.id)">Editar</app-button><app-button variant="ghost" (pressed)="deactivate(item.habit.id)">Desactivar</app-button></div>
          </article>
        } @empty { <p>No hay actividades para hoy.</p> }
      </div></section>
    </app-senior-page>
  `,
  styles: `:host{display:block}.panel{display:grid;gap:var(--space-4)}.panel h2,fieldset{margin:0}.check{align-items:center;display:flex;gap:var(--space-2);min-height:var(--touch-target)}.days,.actions,.manage{display:flex;flex-wrap:wrap;gap:var(--space-2)}fieldset{border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3)}.days label{align-items:center;display:flex;gap:.3rem;min-height:2.5rem}.cards{display:grid;gap:var(--space-3)}.activity{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);display:grid;gap:var(--space-3);padding:var(--space-4)}.activity h3{margin:var(--space-2) 0 0}.activity p{color:var(--color-text-muted);margin:0}.notice{background:var(--color-success-soft);border-radius:var(--radius-md);color:var(--color-success);font-weight:700;margin:0;padding:var(--space-3)}`,
})
export class HabitsPageComponent {
  protected readonly habits = inject(HabitsService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly editing = signal<string | null>(null);
  protected readonly feedback = signal('');
  protected readonly selectedDays = signal<number[]>([0, 1, 2, 3, 4, 5, 6]);
  protected readonly categories: readonly HabitCategory[] = ['HEALTH', 'WELLBEING', 'COGNITION', 'PHYSICAL', 'PERSONAL', 'OTHER'];
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly days = [{ value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mié' }, { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' }];
  protected readonly form = this.formBuilder.nonNullable.group({ name: ['', Validators.required], category: ['OTHER' as HabitCategory, Validators.required], startTime: ['09:00', Validators.required], endTime: [''], active: [true] });

  protected startCreate(): void { this.form.reset({ name: '', category: 'OTHER', startTime: '09:00', endTime: '', active: true }); this.selectedDays.set([0, 1, 2, 3, 4, 5, 6]); this.editing.set('new'); }
  protected startEdit(id: string): void { const habit = this.habits.habits().find((item) => item.id === id); if (!habit) return; this.form.reset({ name: habit.name, category: habit.category, startTime: habit.startTime, endTime: habit.endTime ?? '', active: habit.active }); this.selectedDays.set([...habit.daysOfWeek]); this.editing.set(id); }
  protected toggleDay(day: number): void { this.selectedDays.update((items) => items.includes(day) ? items.filter((item) => item !== day) : [...items, day]); }
  protected save(): void { if (this.form.invalid || !this.selectedDays().length) { this.form.markAllAsTouched(); return; } const value = this.form.getRawValue(); const input = { name: value.name.trim(), category: value.category, daysOfWeek: this.selectedDays(), startTime: value.startTime, ...(value.endTime ? { endTime: value.endTime } : {}), active: value.active }; const id = this.editing(); if (id === 'new') this.habits.create(input); else if (id) this.habits.update(id, input); this.feedback.set('Actividad guardada.'); this.editing.set(null); }
  protected complete(id: string): void { this.habits.complete(id); this.feedback.set('Actividad marcada como realizada.'); }
  protected postpone(id: string, minutes: 15 | 60): void { this.habits.postpone(id, minutes); this.feedback.set(`Actividad pospuesta ${minutes === 60 ? '1 hora' : '15 minutos'}.`); }
  protected skip(id: string): void { this.habits.skip(id); this.feedback.set('Actividad omitida; el historial se conserva.'); }
  protected deactivate(id: string): void { this.habits.deactivate(id); this.feedback.set('Actividad desactivada.'); }
  protected status(value?: string): string { return value === 'COMPLETED' ? 'Realizada' : value === 'SKIPPED' ? 'Omitida' : value === 'POSTPONED' ? 'Pospuesta' : 'Pendiente'; }
}

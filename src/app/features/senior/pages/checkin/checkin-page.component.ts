import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { SeniorStateService } from '../../services/senior-state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, FormsModule, SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-checkin-page',
  template: `
    <app-senior-page eyebrow="Check-in diario" title="¿Cómo te sientes hoy?" description="No hay respuestas correctas. Elige lo que mejor te represente." backPath="/senior/wellbeing">
      <div class="steps" aria-label="Progreso"><span [class.active]="step() >= 0">1</span><i></i><span [class.active]="step() >= 1">2</span><i></i><span [class.active]="step() >= 2">3</span><i></i><span [class.active]="step() >= 3">4</span></div>
      <div class="senior-page__panel question">
        @switch (step()) {
          @case (0) {
            <h2>¿Cómo te sientes hoy?</h2><div class="senior-page__choice-grid">@for (option of moods; track option.label) { <button class="senior-page__choice" [class.selected]="mood() === option.value" [attr.aria-pressed]="mood() === option.value" type="button" (click)="mood.set(option.value)">{{ option.label }}</button> }</div>
          }
          @case (1) {
            <h2>¿Cómo dormiste?</h2><div class="senior-page__choice-grid">@for (option of sleepOptions; track option.label) { <button class="senior-page__choice" [class.selected]="sleep() === option.value" [attr.aria-pressed]="sleep() === option.value" type="button" (click)="sleep.set(option.value)">{{ option.label }}</button> }</div>
          }
          @case (2) {
            <h2>¿Tienes alguna molestia?</h2><div class="senior-page__choice-grid">@for (option of discomfortOptions; track option) { <button class="senior-page__choice" [class.selected]="discomfort() === option" [attr.aria-pressed]="discomfort() === option" type="button" (click)="discomfort.set(option)">{{ option }}</button> }</div>
          }
          @case (3) {
            <h2>¿Quieres contarme algo?</h2><p>Esta nota es opcional.</p><label class="sr-only" for="wellbeing-note">Nota sobre tu día</label><textarea id="wellbeing-note" class="v-input" rows="5" [(ngModel)]="note" placeholder="Escribe aquí con tus propias palabras…"></textarea>
          }
          @default {
            <div class="complete" role="status"><span><app-vitalia-icon name="check" [size]="34" /></span><h2>Tu check-in quedó guardado</h2><p>Gracias, María. Puedes consultar tu Firma VITALIA o volver al inicio.</p><div class="senior-page__actions"><app-button (pressed)="go('/senior/signature')">Ver Firma VITALIA</app-button><app-button variant="ghost" (pressed)="go('/senior')">Volver al inicio</app-button></div></div>
          }
        }
      </div>
      @if (step() < 4) { <div class="senior-page__actions"><app-button variant="ghost" [disabled]="step() === 0" (pressed)="previous()">Anterior</app-button><app-button [disabled]="!canContinue" (pressed)="next()">{{ step() === 3 ? 'Guardar check-in' : 'Continuar' }}</app-button></div> }
    </app-senior-page>
  `,
  styleUrl: './checkin-page.component.scss',
})
export class CheckinPageComponent {
  private readonly state = inject(SeniorStateService);
  private readonly router = inject(Router);
  protected readonly step = signal(0);
  protected readonly mood = signal<number | null>(null);
  protected readonly sleep = signal<number | null>(null);
  protected readonly discomfort = signal('');
  protected note = '';
  protected readonly moods = [{ label: 'Muy bien', value: 5 }, { label: 'Bien', value: 4 }, { label: 'Regular', value: 3 }, { label: 'Mal', value: 2 }, { label: 'Muy mal', value: 1 }] as const;
  protected readonly sleepOptions = [{ label: 'Muy bien', value: 5 }, { label: 'Bien', value: 4 }, { label: 'Más o menos', value: 3 }, { label: 'Dormí poco', value: 2 }] as const;
  protected readonly discomfortOptions = ['No tengo molestias', 'Molestia leve', 'Molestia moderada', 'Necesito apoyo'] as const;

  protected get canContinue(): boolean { return (this.step() === 0 && this.mood() !== null) || (this.step() === 1 && this.sleep() !== null) || (this.step() === 2 && !!this.discomfort()) || this.step() === 3; }
  protected previous(): void { this.step.update((value) => Math.max(0, value - 1)); }
  protected next(): void {
    if (!this.canContinue) return;
    if (this.step() === 3) {
      this.state.saveWellbeing({ mood: this.mood() ?? 3, sleep: this.sleep() ?? 3, discomfort: this.discomfort(), note: this.note.trim() });
    }
    this.step.update((value) => Math.min(4, value + 1));
  }
  protected go(path: string): void { void this.router.navigateByUrl(path); }
}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-cognitive-activity-page',
  template: `
    <app-senior-page eyebrow="Actividad de memoria" title="Recuerda la secuencia" description="Una práctica breve, sin presión y a tu propio ritmo." backPath="/senior/self-care">
      @if (step() === 'intro') { <div class="senior-page__panel intro"><span><app-vitalia-icon name="brain" [size]="38" /></span><h2>Observa tres palabras</h2><p>Después elige cuál apareció primero. Puedes repetir el ejercicio.</p><app-button (pressed)="start()">Comenzar</app-button></div> }
      @else if (step() === 'show') { <div class="sequence" aria-live="polite">@for (word of words; track word) { <span>{{ word }}</span> }</div><p class="instruction">Memoriza el orden. La pregunta aparecerá en un momento.</p> }
      @else if (step() === 'question') { <div class="senior-page__panel"><h2>¿Cuál palabra apareció primero?</h2><div class="senior-page__choice-grid">@for (word of shuffledWords; track word) { <button class="senior-page__choice" type="button" (click)="answer(word)">{{ word }}</button> }</div></div> }
      @else { <div class="result" [class.correct]="correct()"><span><app-vitalia-icon [name]="correct() ? 'check' : 'sparkles'" [size]="34" /></span><h2>{{ correct() ? '¡Muy bien!' : 'Buen intento' }}</h2><p>{{ correct() ? 'Recordaste correctamente la secuencia.' : 'La primera palabra era Jardín. Practicar también cuenta.' }}</p><app-button (pressed)="reset()">Repetir actividad</app-button></div> }
    </app-senior-page>
  `,
  styleUrl: './cognitive-activity-page.component.scss',
})
export class CognitiveActivityPageComponent {
  protected readonly words = ['Jardín', 'Música', 'Familia'] as const;
  protected readonly shuffledWords = ['Música', 'Familia', 'Jardín'] as const;
  protected readonly step = signal<'intro' | 'show' | 'question' | 'result'>('intro');
  protected readonly correct = signal(false);
  protected start(): void { this.step.set('show'); globalThis.setTimeout(() => this.step.set('question'), 1800); }
  protected answer(word: string): void { this.correct.set(word === this.words[0]); this.step.set('result'); }
  protected reset(): void { this.correct.set(false); this.step.set('intro'); }
}

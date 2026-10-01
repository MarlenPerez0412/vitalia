import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

interface WordCard {
  emoji: string;
  label: string;
}

const WORD_POOL: WordCard[] = [
  { emoji: '🌷', label: 'Jardín' },
  { emoji: '🎵', label: 'Música' },
  { emoji: '👨‍👩‍👧', label: 'Familia' },
  { emoji: '🏠', label: 'Casa' },
  { emoji: '☕', label: 'Café' },
  { emoji: '🐶', label: 'Perro' },
  { emoji: '📖', label: 'Libro' },
  { emoji: '🌞', label: 'Sol' },
  { emoji: '🌳', label: 'Árbol' },
  { emoji: '🌸', label: 'Flor' },
  { emoji: '📻', label: 'Radio' },
];

function shuffleArr<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-cognitive-activity-page',
  template: `
    <app-senior-page eyebrow="Actividad de memoria" title="Recuerda la secuencia" description="Una práctica breve, sin presión y a tu propio ritmo." backPath="/senior/self-care">
      @if (step() === 'intro') {
        <div class="senior-page__panel intro">
          <span><app-vitalia-icon name="brain" [size]="38" /></span>
          <h2>Observa tres palabras</h2>
          <p>Después elige cuál apareció primero. Puedes repetir el ejercicio.</p>
          <app-button (pressed)="start()">Comenzar</app-button>
        </div>
      }
      @else if (step() === 'show') {
        <div class="sequence" aria-live="polite">
          @for (word of words(); track word.label) {
            <span><span class="seq-emoji" aria-hidden="true">{{ word.emoji }}</span>{{ word.label }}</span>
          }
        </div>
        <p class="instruction">Memoriza el orden. La pregunta aparecerá en un momento.</p>
      }
      @else if (step() === 'question') {
        <div class="senior-page__panel">
          <h2>¿Cuál palabra apareció primero?</h2>
          <div class="senior-page__choice-grid">
            @for (word of shuffledWords(); track word.label) {
              <button class="senior-page__choice mem-opt" type="button"
                [attr.aria-label]="'Respuesta: ' + word.label"
                (click)="answer(word.label)">
                <span class="seq-emoji" aria-hidden="true">{{ word.emoji }}</span>{{ word.label }}
              </button>
            }
          </div>
        </div>
      }
      @else {
        <div class="result" [class.correct]="correct()">
          <span><app-vitalia-icon [name]="correct() ? 'check' : 'sparkles'" [size]="34" /></span>
          <h2>{{ correct() ? '¡Muy bien!' : 'Buen intento' }}</h2>
          <p>{{ correct() ? 'Recordaste correctamente la secuencia.' : 'La primera palabra era ' + firstLabel() + '. ¡Practicar siempre suma!' }}</p>
          <app-button (pressed)="reset()">Repetir actividad</app-button>
        </div>
      }
    </app-senior-page>
  `,
  styleUrl: './cognitive-activity-page.component.scss',
})
export class CognitiveActivityPageComponent {
  protected readonly step = signal<'intro' | 'show' | 'question' | 'result'>('intro');
  protected readonly correct = signal(false);
  protected readonly words = signal<WordCard[]>([]);
  protected readonly shuffledWords = signal<WordCard[]>([]);

  protected firstLabel(): string {
    return this.words()[0]?.label ?? '';
  }

  protected start(): void {
    const selected = shuffleArr(WORD_POOL).slice(0, 3);
    this.words.set(selected);
    this.shuffledWords.set(shuffleArr([...selected]));
    this.step.set('show');
    globalThis.setTimeout(() => this.step.set('question'), 2000);
  }

  protected answer(label: string): void {
    this.correct.set(label === this.words()[0]?.label);
    this.step.set('result');
  }

  protected reset(): void {
    this.correct.set(false);
    this.step.set('intro');
  }
}

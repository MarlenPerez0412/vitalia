import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

interface ClassifyItem {
  label: string;
  emoji: string;
  category: string;
}

interface Category {
  label: string;
  emoji: string;
}

const CATEGORIES: Category[] = [
  { label: 'Alimentos', emoji: '🥗' },
  { label: 'Animales', emoji: '🐾' },
  { label: 'Hogar', emoji: '🏠' },
];

const ALL_ITEMS: ClassifyItem[] = [
  { label: 'Manzana', emoji: '🍎', category: 'Alimentos' },
  { label: 'Perro', emoji: '🐶', category: 'Animales' },
  { label: 'Radio', emoji: '📻', category: 'Hogar' },
  { label: 'Zanahoria', emoji: '🥕', category: 'Alimentos' },
  { label: 'Taza', emoji: '☕', category: 'Hogar' },
  { label: 'Gato', emoji: '🐱', category: 'Animales' },
  { label: 'Naranja', emoji: '🍊', category: 'Alimentos' },
  { label: 'Pájaro', emoji: '🐦', category: 'Animales' },
  { label: 'Lámpara', emoji: '💡', category: 'Hogar' },
  { label: 'Pera', emoji: '🍐', category: 'Alimentos' },
];

const TOTAL_ROUNDS = 5;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, SeniorPageComponent],
  selector: 'app-classify-page',
  template: `
    <app-senior-page eyebrow="Juegos cognitivos" title="Clasifica y combina" description="Relaciona cada elemento con el lugar al que pertenece." backPath="/senior/self-care">
      @switch (step()) {
        @case ('intro') {
          <div class="senior-page__panel cl-center">
            <span class="cl-icon" aria-hidden="true">🗂️</span>
            <h2>Cada cosa en su lugar</h2>
            <p>Mira el elemento y elige a qué grupo pertenece. Tómate tu tiempo.</p>
            <app-button (pressed)="begin()">Comenzar</app-button>
          </div>
        }
        @case ('round') {
          <div class="senior-page__panel">
            <p class="cl-progress" aria-live="polite">{{ roundIndex() + 1 }} de {{ totalRounds }}</p>
            <div class="cl-item-display" aria-label="Elemento a clasificar: {{ currentItem().label }}">
              <span class="cl-big-emoji" aria-hidden="true">{{ currentItem().emoji }}</span>
              <span class="cl-item-label">{{ currentItem().label }}</span>
            </div>
            <p class="cl-question">¿Dónde pertenece?</p>
            <div class="senior-page__choice-grid">
              @for (cat of categories; track cat.label) {
                <button class="senior-page__choice cl-cat-btn" type="button"
                  [attr.aria-label]="'Categoría: ' + cat.label"
                  (click)="pick(cat.label)">
                  <span class="cl-cat-emoji" aria-hidden="true">{{ cat.emoji }}</span>
                  <span>{{ cat.label }}</span>
                </button>
              }
            </div>
          </div>
        }
        @case ('feedback') {
          <div class="senior-page__panel cl-center" [class.cl-ok]="lastCorrect()" [class.cl-hint]="!lastCorrect()">
            <span class="cl-icon" role="status" aria-live="assertive">{{ lastCorrect() ? '🎉' : '😊' }}</span>
            <h2>{{ lastCorrect() ? '¡Correcto!' : 'Casi. Sigue adelante.' }}</h2>
            <app-button (pressed)="nextRound()">
              {{ roundIndex() + 1 < totalRounds ? 'Siguiente' : 'Ver resultado' }}
            </app-button>
          </div>
        }
        @case ('complete') {
          <div class="senior-page__panel cl-center cl-ok">
            <span class="cl-icon" role="status" aria-live="polite">🌟</span>
            <h2>¡Actividad completada!</h2>
            <p>Clasificaste {{ score() }} de {{ totalRounds }} correctamente. ¡Buen trabajo!</p>
            <div class="senior-page__actions">
              <app-button (pressed)="begin()">Jugar otra vez</app-button>
              <app-button variant="ghost" (pressed)="reset()">Volver a Autocuidado</app-button>
            </div>
          </div>
        }
      }
    </app-senior-page>
  `,
  styleUrl: './classify-page.component.scss',
})
export class ClassifyPageComponent {
  protected readonly step = signal<'intro' | 'round' | 'feedback' | 'complete'>('intro');
  protected readonly roundIndex = signal(0);
  protected readonly lastCorrect = signal(false);
  protected readonly score = signal(0);
  protected readonly totalRounds = TOTAL_ROUNDS;
  protected readonly categories = CATEGORIES;
  private items: ClassifyItem[] = [];

  protected readonly currentItem = computed(() => this.items[this.roundIndex()] ?? this.items[0]);

  protected begin(): void {
    this.items = this.shuffle([...ALL_ITEMS]).slice(0, TOTAL_ROUNDS);
    this.roundIndex.set(0);
    this.score.set(0);
    this.step.set('round');
  }

  protected pick(category: string): void {
    const correct = category === this.currentItem().category;
    this.lastCorrect.set(correct);
    if (correct) this.score.update((s) => s + 1);
    this.step.set('feedback');
  }

  protected nextRound(): void {
    const next = this.roundIndex() + 1;
    if (next >= TOTAL_ROUNDS) {
      this.step.set('complete');
    } else {
      this.roundIndex.set(next);
      this.step.set('round');
    }
  }

  protected reset(): void {
    this.step.set('intro');
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

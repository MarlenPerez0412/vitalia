import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

interface Round {
  items: string[];
  differentIndex: number;
}

const ALL_ROUNDS: Round[] = [
  { items: ['🌻', '🌻', '🌻', '🌼'], differentIndex: 3 },
  { items: ['🍎', '🍎', '🍐', '🍎'], differentIndex: 2 },
  { items: ['🏠', '🏠', '🏡', '🏠'], differentIndex: 2 },
  { items: ['🐱', '🐱', '🐱', '🐶'], differentIndex: 3 },
  { items: ['🌕', '🌕', '⭐', '🌕'], differentIndex: 2 },
  { items: ['🍓', '🍓', '🍇', '🍓'], differentIndex: 2 },
  { items: ['🌹', '🌹', '🌹', '🌷'], differentIndex: 3 },
  { items: ['🚗', '🚗', '🚕', '🚗'], differentIndex: 2 },
  { items: ['🎵', '🎵', '🎶', '🎵'], differentIndex: 2 },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, SeniorPageComponent],
  selector: 'app-find-different-page',
  template: `
    <app-senior-page eyebrow="Ejercicios mentales" title="Encuentra el diferente" description="Pon a prueba tu atención de forma tranquila." backPath="/senior/self-care">
      @switch (step()) {
        @case ('intro') {
          <div class="senior-page__panel fd-center">
            <span class="fd-icon" aria-hidden="true">🔍</span>
            <h2>Observa y elige</h2>
            <p>Observa los elementos y selecciona cuál es diferente. Sin prisa.</p>
            <app-button (pressed)="begin()">Comenzar</app-button>
          </div>
        }
        @case ('round') {
          <div class="senior-page__panel">
            <p class="fd-progress" aria-live="polite">Ronda {{ roundIndex() + 1 }} de {{ totalRounds }}</p>
            <div class="fd-grid" role="group" [attr.aria-label]="'Ronda ' + (roundIndex() + 1) + '. Selecciona el elemento diferente.'">
              @for (item of currentRound().items; track $index) {
                <button class="fd-item" type="button" [attr.aria-label]="'Opción ' + ($index + 1)" (click)="pick($index)">{{ item }}</button>
              }
            </div>
          </div>
        }
        @case ('feedback') {
          <div class="senior-page__panel fd-center" [class.fd-ok]="lastCorrect()" [class.fd-hint]="!lastCorrect()">
            <span class="fd-icon" aria-live="assertive" role="status">{{ lastCorrect() ? '🎉' : '😊' }}</span>
            <h2>{{ lastCorrect() ? '¡Muy bien! Lo encontraste.' : 'Casi. Obsérvalos nuevamente.' }}</h2>
            <app-button (pressed)="nextRound()">
              {{ roundIndex() + 1 < totalRounds ? 'Siguiente ronda' : 'Ver resultado' }}
            </app-button>
          </div>
        }
        @case ('complete') {
          <div class="senior-page__panel fd-center fd-ok">
            <span class="fd-icon" role="status" aria-live="polite">🌟</span>
            <h2>¡Actividad completada!</h2>
            <p>Encontraste {{ score() }} de {{ totalRounds }}. ¡Practicar siempre vale la pena!</p>
            <div class="senior-page__actions">
              <app-button (pressed)="begin()">Repetir actividad</app-button>
              <app-button variant="ghost" (pressed)="reset()">Volver al inicio</app-button>
            </div>
          </div>
        }
      }
    </app-senior-page>
  `,
  styleUrl: './find-different-page.component.scss',
})
export class FindDifferentPageComponent {
  protected readonly step = signal<'intro' | 'round' | 'feedback' | 'complete'>('intro');
  protected readonly roundIndex = signal(0);
  protected readonly lastCorrect = signal(false);
  protected readonly score = signal(0);
  protected readonly totalRounds = 3;
  private rounds: Round[] = [];

  protected readonly currentRound = computed(() => this.rounds[this.roundIndex()] ?? this.rounds[0]);

  protected begin(): void {
    this.rounds = this.shuffle([...ALL_ROUNDS]).slice(0, this.totalRounds);
    this.roundIndex.set(0);
    this.score.set(0);
    this.step.set('round');
  }

  protected pick(index: number): void {
    const correct = index === this.currentRound().differentIndex;
    this.lastCorrect.set(correct);
    if (correct) this.score.update((s) => s + 1);
    this.step.set('feedback');
  }

  protected nextRound(): void {
    const next = this.roundIndex() + 1;
    if (next >= this.totalRounds) {
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

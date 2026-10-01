import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

interface WnRound {
  sequence: string[];
  answer: string;
  options: [string, string, string];
}

const ALL_ROUNDS: WnRound[] = [
  { sequence: ['🔵', '🟢', '🔵', '🟢'], answer: '🔵', options: ['🔵', '🟢', '🟡'] },
  { sequence: ['🌞', '🌙', '🌞', '🌙'], answer: '🌞', options: ['🌞', '🌙', '⭐'] },
  { sequence: ['🍎', '🍎', '🍐', '🍎', '🍎'], answer: '🍐', options: ['🍎', '🍐', '🍊'] },
  { sequence: ['🐱', '🐶', '🐱', '🐶'], answer: '🐱', options: ['🐱', '🐶', '🐰'] },
  { sequence: ['🌷', '🌹', '🌷', '🌹'], answer: '🌷', options: ['🌷', '🌹', '🌻'] },
  { sequence: ['1', '2', '3'], answer: '4', options: ['4', '5', '6'] },
  { sequence: ['🔴', '🔵', '🔴', '🔵'], answer: '🔴', options: ['🔴', '🔵', '🟡'] },
  { sequence: ['☀️', '🌧️', '☀️', '🌧️'], answer: '☀️', options: ['☀️', '🌧️', '❄️'] },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, SeniorPageComponent],
  selector: 'app-whats-next-page',
  template: `
    <app-senior-page eyebrow="Razonamiento" title="¿Qué sigue?" description="Observa la secuencia y encuentra qué elemento continúa." backPath="/senior/self-care">
      @switch (step()) {
        @case ('intro') {
          <div class="senior-page__panel wn-center">
            <span class="wn-icon" aria-hidden="true">🧩</span>
            <h2>Reconoce el patrón</h2>
            <p>Mira los elementos en orden y elige cuál viene después. Sin apuro.</p>
            <app-button (pressed)="begin()">Comenzar</app-button>
          </div>
        }
        @case ('round') {
          <div class="senior-page__panel">
            <p class="wn-progress" aria-live="polite">Ronda {{ roundIndex() + 1 }} de {{ totalRounds }}</p>
            <div class="wn-sequence" aria-label="Secuencia de elementos">
              @for (item of currentRound().sequence; track $index) {
                <span class="wn-seq-item" aria-hidden="true">{{ item }}</span>
              }
              <span class="wn-seq-unknown" aria-label="elemento desconocido">?</span>
            </div>
            <p class="wn-question">¿Qué elemento continúa la secuencia?</p>
            <div class="senior-page__choice-grid wn-options">
              @for (opt of currentRound().options; track opt) {
                <button class="senior-page__choice wn-opt" type="button"
                  [attr.aria-label]="'Opción: ' + opt"
                  (click)="pick(opt)">{{ opt }}</button>
              }
            </div>
          </div>
        }
        @case ('feedback') {
          <div class="senior-page__panel wn-center" [class.wn-ok]="lastCorrect()" [class.wn-hint]="!lastCorrect()">
            <span class="wn-icon" role="status" aria-live="assertive">{{ lastCorrect() ? '🎉' : '😊' }}</span>
            <h2>{{ lastCorrect() ? '¡Muy bien! Lo identificaste.' : 'Casi. Sigue intentando.' }}</h2>
            <app-button (pressed)="nextRound()">
              {{ roundIndex() + 1 < totalRounds ? 'Siguiente ronda' : 'Ver resultado' }}
            </app-button>
          </div>
        }
        @case ('complete') {
          <div class="senior-page__panel wn-center wn-ok">
            <span class="wn-icon" role="status" aria-live="polite">🌟</span>
            <h2>¡Actividad completada!</h2>
            <p>Encontraste {{ score() }} de {{ totalRounds }}. ¡Excelente esfuerzo!</p>
            <div class="senior-page__actions">
              <app-button (pressed)="begin()">Repetir actividad</app-button>
              <app-button variant="ghost" (pressed)="reset()">Volver al inicio</app-button>
            </div>
          </div>
        }
      }
    </app-senior-page>
  `,
  styleUrl: './whats-next-page.component.scss',
})
export class WhatsNextPageComponent {
  protected readonly step = signal<'intro' | 'round' | 'feedback' | 'complete'>('intro');
  protected readonly roundIndex = signal(0);
  protected readonly lastCorrect = signal(false);
  protected readonly score = signal(0);
  protected readonly totalRounds = 3;
  private rounds: WnRound[] = [];

  protected readonly currentRound = computed(() => this.rounds[this.roundIndex()] ?? this.rounds[0]);

  protected begin(): void {
    this.rounds = this.shuffle([...ALL_ROUNDS]).slice(0, this.totalRounds);
    this.roundIndex.set(0);
    this.score.set(0);
    this.step.set('round');
  }

  protected pick(option: string): void {
    const correct = option === this.currentRound().answer;
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

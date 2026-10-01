import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

type BreathPhase = 'inhale' | 'exhale';
type Step = 'intro' | 'breathe' | 'reflection';

const PHASE_MS = 4000;
const TOTAL_CYCLES = 3;

const FEELINGS = [
  { emoji: '🙂', label: 'Mejor' },
  { emoji: '😌', label: 'Tranquilo/a' },
  { emoji: '😐', label: 'Igual' },
  { emoji: '💬', label: 'Quiero contar algo' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, SeniorPageComponent],
  selector: 'app-breathe-page',
  template: `
    <app-senior-page eyebrow="Bienestar emocional" title="Respira conmigo" description="Una pausa breve para respirar con calma." backPath="/senior/self-care">
      @switch (step()) {
        @case ('intro') {
          <div class="senior-page__panel br-center">
            <span class="br-icon" aria-hidden="true">🌿</span>
            <h2>Un momento para ti</h2>
            <p>Vamos a respirar juntos, lento y tranquilo. Solo {{ TOTAL_CYCLES }} ciclos.</p>
            <app-button (pressed)="begin()">Comenzar</app-button>
          </div>
        }
        @case ('breathe') {
          <div class="senior-page__panel br-breathe">
            <p class="br-progress" aria-live="polite">Ciclo {{ cycleCount() }} de {{ TOTAL_CYCLES }}</p>
            <div class="br-circle-wrap" aria-live="assertive" [attr.aria-label]="phase() === 'inhale' ? 'Inhala' : 'Exhala'">
              <div class="br-circle" [class.br-inhale]="phase() === 'inhale'" [class.br-exhale]="phase() === 'exhale'"></div>
              <span class="br-label">{{ phase() === 'inhale' ? 'Inhala…' : 'Exhala…' }}</span>
            </div>
            <app-button variant="ghost" (pressed)="stopBreathing()">Terminar</app-button>
          </div>
        }
        @case ('reflection') {
          <div class="senior-page__panel br-center">
            <span class="br-icon" aria-hidden="true">💜</span>
            <h2>¿Cómo te sientes ahora?</h2>
            <div class="senior-page__choice-grid br-feelings">
              @for (feeling of feelings; track feeling.label) {
                <button class="senior-page__choice br-feeling-btn" type="button"
                  [attr.aria-label]="'Me siento: ' + feeling.label"
                  (click)="selectFeeling(feeling.label)">
                  <span class="br-feeling-emoji" aria-hidden="true">{{ feeling.emoji }}</span>
                  <span>{{ feeling.label }}</span>
                </button>
              }
            </div>
          </div>
        }
      }
    </app-senior-page>
  `,
  styleUrl: './breathe-page.component.scss',
})
export class BreathePageComponent {
  protected readonly step = signal<Step>('intro');
  protected readonly phase = signal<BreathPhase>('inhale');
  protected readonly cycleCount = signal(1);
  protected readonly feelings = FEELINGS;
  protected readonly TOTAL_CYCLES = TOTAL_CYCLES;

  private timeoutId: ReturnType<typeof setTimeout> | undefined;
  private readonly reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  protected begin(): void {
    this.cycleCount.set(1);
    this.phase.set('inhale');
    this.step.set('breathe');
    this.scheduleNext(1, 'inhale');
  }

  protected stopBreathing(): void {
    this.clearTimer();
    this.step.set('reflection');
  }

  protected selectFeeling(_label: string): void {
    this.step.set('intro');
  }

  private scheduleNext(cycle: number, currentPhase: BreathPhase): void {
    const delay = this.reducedMotion ? 500 : PHASE_MS;
    this.timeoutId = setTimeout(() => {
      if (currentPhase === 'inhale') {
        this.phase.set('exhale');
        this.scheduleNext(cycle, 'exhale');
      } else {
        if (cycle >= TOTAL_CYCLES) {
          this.step.set('reflection');
        } else {
          const next = cycle + 1;
          this.cycleCount.set(next);
          this.phase.set('inhale');
          this.scheduleNext(next, 'inhale');
        }
      }
    }, delay);
  }

  private clearTimer(): void {
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}

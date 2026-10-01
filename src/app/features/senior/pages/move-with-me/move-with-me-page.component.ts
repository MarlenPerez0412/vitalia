import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

interface Exercise {
  emoji: string;
  name: string;
  instruction: string;
}

const EXERCISES: Exercise[] = [
  { emoji: '🙆', name: 'Brazos arriba', instruction: 'Levanta los brazos suavemente hacia arriba.' },
  { emoji: '🙋', name: 'Hombros', instruction: 'Mueve los hombros hacia adelante y hacia atrás.' },
  { emoji: '👐', name: 'Manos', instruction: 'Abre y cierra las manos lentamente.' },
  { emoji: '🦶', name: 'Pies', instruction: 'Mueve suavemente los pies, uno a la vez.' },
];

const DURATION_MS = 5000;
const TICK_MS = 100;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, SeniorPageComponent],
  selector: 'app-move-with-me-page',
  template: `
    <app-senior-page eyebrow="Actividad física" title="Muévete conmigo" description="Movimientos suaves para activar tu cuerpo." backPath="/senior/self-care">
      @switch (step()) {
        @case ('intro') {
          <div class="senior-page__panel mw-center">
            <span class="mw-icon" aria-hidden="true">🧘</span>
            <h2>Unos minutos para ti</h2>
            <div class="senior-page__notice">
              <p><strong>Antes de comenzar</strong><span>Realiza únicamente los movimientos que sean cómodos para ti. Puedes detenerte cuando quieras.</span></p>
            </div>
            <app-button (pressed)="startExercise()">Comenzar</app-button>
          </div>
        }
        @case ('exercise') {
          <div class="senior-page__panel mw-exercise">
            <p class="mw-progress" aria-live="polite">Ejercicio {{ exerciseIndex() + 1 }} de {{ exercises.length }}</p>
            <div class="mw-display">
              <span class="mw-big-emoji" aria-hidden="true">{{ currentExercise().emoji }}</span>
              <h2>{{ currentExercise().name }}</h2>
              <p>{{ currentExercise().instruction }}</p>
            </div>
            <div class="mw-bar-wrap" role="progressbar" [attr.aria-valuenow]="progressPercent()" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="'Progreso del ejercicio'">
              <div class="mw-bar" [style.width.%]="progressPercent()"></div>
            </div>
            <div class="senior-page__actions mw-actions">
              <app-button variant="ghost" (pressed)="pause()">{{ paused() ? 'Reanudar' : 'Pausar' }}</app-button>
              <app-button variant="ghost" (pressed)="skip()">Siguiente</app-button>
              <app-button variant="ghost" (pressed)="finish()">Terminar</app-button>
            </div>
          </div>
        }
        @case ('complete') {
          <div class="senior-page__panel mw-center mw-ok">
            <span class="mw-icon" role="status" aria-live="polite">🌟</span>
            <h2>¡Muy bien!</h2>
            <p>Te regalaste unos minutos de movimiento.</p>
            <div class="senior-page__actions">
              <app-button (pressed)="startExercise()">Repetir actividad</app-button>
              <app-button variant="ghost" (pressed)="reset()">Volver a Autocuidado</app-button>
            </div>
          </div>
        }
      }
    </app-senior-page>
  `,
  styleUrl: './move-with-me-page.component.scss',
})
export class MoveWithMePageComponent {
  protected readonly step = signal<'intro' | 'exercise' | 'complete'>('intro');
  protected readonly exerciseIndex = signal(0);
  protected readonly elapsed = signal(0);
  protected readonly paused = signal(false);
  protected readonly exercises = EXERCISES;

  private intervalId: ReturnType<typeof setInterval> | undefined;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  protected get currentExercise(): () => Exercise {
    return () => this.exercises[this.exerciseIndex()] ?? this.exercises[0];
  }

  protected progressPercent(): number {
    return Math.min(100, (this.elapsed() / DURATION_MS) * 100);
  }

  protected startExercise(): void {
    this.exerciseIndex.set(0);
    this.elapsed.set(0);
    this.paused.set(false);
    this.step.set('exercise');
    this.startTimer();
  }

  protected pause(): void {
    if (this.paused()) {
      this.paused.set(false);
      this.startTimer();
    } else {
      this.paused.set(true);
      this.clearTimer();
    }
  }

  protected skip(): void {
    this.clearTimer();
    this.advanceExercise();
  }

  protected finish(): void {
    this.clearTimer();
    this.step.set('complete');
  }

  protected reset(): void {
    this.clearTimer();
    this.step.set('intro');
  }

  private startTimer(): void {
    this.clearTimer();
    this.intervalId = setInterval(() => {
      this.elapsed.update((e) => e + TICK_MS);
      if (this.elapsed() >= DURATION_MS) {
        this.clearTimer();
        this.advanceExercise();
      }
    }, TICK_MS);
  }

  private advanceExercise(): void {
    const next = this.exerciseIndex() + 1;
    if (next >= this.exercises.length) {
      this.step.set('complete');
    } else {
      this.exerciseIndex.set(next);
      this.elapsed.set(0);
      this.paused.set(false);
      this.startTimer();
    }
  }

  private clearTimer(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

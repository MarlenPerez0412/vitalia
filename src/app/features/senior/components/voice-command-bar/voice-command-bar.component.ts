import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { VoiceCommandService, VoiceCommandState } from '../../services/voice-command.service';

const STATE_LABELS: Record<VoiceCommandState, string> = {
  off: 'Desactivados',
  starting: 'Activando micrófono…',
  listening: 'Escuchando. Di «LIA» y tu instrucción.',
  processing: 'Procesando lo que dijiste…',
  'paused-lia': 'En pausa mientras hablas con LIA.',
  'paused-speech': 'En pausa mientras LIA habla.',
  'paused-hidden': 'En pausa: VITALIA no está a la vista.',
  error: 'No disponibles.',
};

/** Control e indicador de los comandos globales de voz (siempre visible en Senior). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, VitaliaIconComponent],
  selector: 'app-voice-command-bar',
  template: `
    <section class="voice" [class.voice--on]="voice.enabled()" aria-label="Comandos de voz">
      @if (voice.enabled()) {
        <div class="status">
          <span class="mic" [class.mic--hearing]="voice.hearingSpeech()" aria-hidden="true"><app-vitalia-icon name="microphone" [size]="22" /></span>
          <p><strong>🎙 Comandos de voz activos</strong><span>{{ stateLabel() }}</span></p>
        </div>
        <app-button variant="ghost" icon="close" (pressed)="voice.disable()">Desactivar</app-button>
      } @else {
        <div class="status">
          <span class="mic" aria-hidden="true"><app-vitalia-icon name="microphone" [size]="22" /></span>
          <p><strong>Comandos de voz</strong><span>Di «LIA» seguido de una instrucción.</span></p>
        </div>
        <app-button variant="voice" icon="microphone" (pressed)="voice.requestEnable()">Activar comandos de voz</app-button>
        @if (voice.errorMessage()) { <p class="error" role="alert">{{ voice.errorMessage() }}</p> }
      }
      <div class="feedback" aria-live="polite">
        @if (voice.feedback(); as feedback) {
          <div [class]="'bubble bubble--' + feedback.tone">
            @if (feedback.heard) { <small>Escuché: «{{ feedback.heard }}»</small> }
            <strong>{{ feedback.message }}</strong>
            @if (feedback.action; as action) { <app-button variant="ghost" icon="chevron-right" (pressed)="go(action.route)">{{ action.label }}</app-button> }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .voice { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); display: grid; gap: var(--space-3); padding: var(--space-3) var(--space-4); }
    .voice--on { background: linear-gradient(135deg, color-mix(in srgb, var(--color-lia-start) 18%, white), color-mix(in srgb, var(--color-lia-end) 18%, white)); border-color: color-mix(in srgb, var(--color-secondary) 40%, transparent); }
    .status { align-items: center; display: flex; gap: var(--space-3); min-width: 0; }
    .status p { margin: 0; min-width: 0; }
    .status strong, .status span { display: block; }
    .status span { color: var(--color-text-muted); font-size: var(--font-size-small); }
    .mic { align-items: center; background: linear-gradient(145deg, var(--color-lia-start), var(--color-lia-end)); border-radius: 50%; color: var(--color-lia-text); display: inline-flex; flex: 0 0 2.75rem; height: 2.75rem; justify-content: center; position: relative; }
    .voice--on .mic::after { animation: listen 1.6s ease-out infinite; border: 2px solid var(--color-secondary); border-radius: 50%; content: ''; inset: -4px; position: absolute; }
    .mic--hearing { box-shadow: 0 0 0 .3rem color-mix(in srgb, var(--color-secondary) 35%, transparent); }
    .error { color: var(--color-emergency); font-size: var(--font-size-small); font-weight: 700; margin: 0; }
    .feedback:empty { display: none; }
    .bubble { background: var(--color-surface); border-left: .3rem solid var(--color-secondary); border-radius: var(--radius-md); display: grid; gap: var(--space-1); padding: var(--space-3); }
    .bubble small { color: var(--color-text-muted); }
    .bubble--warning { border-left-color: var(--color-emergency); }
    .bubble--success { border-left-color: var(--color-success); }
    @keyframes listen { from { opacity: .9; transform: scale(1); } to { opacity: 0; transform: scale(1.45); } }
    @media (prefers-reduced-motion: reduce) { .voice--on .mic::after { animation: none; opacity: .6; } }
  `,
})
export class VoiceCommandBarComponent {
  protected readonly voice = inject(VoiceCommandService);
  private readonly router = inject(Router);
  protected readonly stateLabel = computed(() => STATE_LABELS[this.voice.state()]);
  protected go(route: string): void { void this.router.navigateByUrl(route); }
}

import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { AppButtonComponent } from '../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent, VitaliaIconName } from '../../../shared/ui/icon/vitalia-icon.component';

/**
 * Tarjeta comun de las pantallas de Entretenimiento.
 * variant="compact" (default): icono pequeño + cuerpo horizontal.
 * variant="poster": imagen de ancho completo arriba, cuerpo abajo.
 * Con `toggle` la accion despliega el contenido proyectado;
 * sin `toggle` solo emite `action` (por ejemplo, para abrir un enlace externo).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, VitaliaIconComponent],
  selector: 'app-entertainment-card',
  template: `
    <article [class]="variant() === 'poster' ? 'card card--poster' : 'card'">
      <div class="card__media">
        @if (image() && !imgFailed()) {
          <img [src]="image()" [alt]="imageAlt()" loading="lazy" (error)="onImgError()" />
        } @else {
          <span aria-hidden="true"><app-vitalia-icon [name]="icon()" [size]="variant() === 'poster' ? 48 : 34" /></span>
        }
      </div>
      <div class="card__body">
        <h2>{{ title() }}</h2>
        @if (meta().length) { <ul class="card__meta">@for (item of meta(); track item) { <li>{{ item }}</li> }</ul> }
        <p>{{ description() }}</p>
        @if (expanded()) { <div class="card__detail"><ng-content /></div> }
        <app-button variant="secondary" [icon]="actionIcon()" (pressed)="press()">{{ expanded() ? expandedLabel() : actionLabel() }}</app-button>
      </div>
    </article>
  `,
  styles: `
    :host { display: block; min-width: 0; }

    /* Variante compacta (default) */
    .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-xs); display: grid; gap: var(--space-4); grid-template-columns: auto minmax(0, 1fr); height: 100%; padding: var(--space-4); }
    .card__media { align-items: center; align-self: start; background: color-mix(in srgb, var(--color-module-entertainment) 38%, white); border-radius: var(--radius-lg); color: var(--color-text); display: inline-flex; height: 4.5rem; justify-content: center; overflow: hidden; width: 4.5rem; }
    .card__media img { height: 100%; object-fit: cover; width: 100%; }

    /* Variante poster */
    .card--poster { grid-template-columns: 1fr; overflow: hidden; padding: 0; }
    .card--poster .card__media { align-self: stretch; border-radius: 0; height: 12rem; width: 100%; }
    .card--poster .card__body { padding: var(--space-4); }

    .card__body { display: grid; gap: var(--space-3); justify-items: start; min-width: 0; }
    .card__body h2 { font-size: var(--font-size-card-title); line-height: var(--line-height-tight); margin: 0; overflow-wrap: anywhere; }
    .card__body p { color: var(--color-text-muted); margin: 0; overflow-wrap: anywhere; }
    .card__meta { display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; margin: 0; padding: 0; }
    .card__meta li { background: var(--color-primary-soft); border-radius: 999px; color: var(--color-primary-active); font-size: var(--font-size-small); font-weight: 700; padding: .2rem .7rem; }
    .card__detail { border-top: 1px solid var(--color-border); display: grid; gap: var(--space-3); padding-top: var(--space-3); width: 100%; }

    @media (max-width: 29.99rem) { .card:not(.card--poster) { grid-template-columns: 1fr; } }
  `,
})
export class EntertainmentCardComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly meta = input<string[]>([]);
  readonly icon = input<VitaliaIconName>('sparkles');
  readonly image = input('');
  readonly imageAlt = input('');
  readonly variant = input<'compact' | 'poster'>('compact');
  readonly actionLabel = input.required<string>();
  readonly expandedLabel = input('Ocultar');
  readonly actionIcon = input<VitaliaIconName>();
  readonly toggle = input(true);
  readonly action = output<void>();
  protected readonly expanded = signal(false);
  protected readonly imgFailed = signal(false);

  protected press(): void {
    if (this.toggle()) this.expanded.update((value) => !value);
    this.action.emit();
  }

  protected onImgError(): void { this.imgFailed.set(true); }
}

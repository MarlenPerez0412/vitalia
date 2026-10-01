import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { VitaliaIconComponent, VitaliaIconName } from '../icon/vitalia-icon.component';

/** Colores suaves de la marca por modulo (ver tokens `--color-module-*`). */
export type ModuleTileColor = 'coral' | 'yellow' | 'lilac' | 'green' | 'blue' | 'turquoise' | 'teal';

/**
 * Acceso visual a un modulo: toda la tarjeta es un unico boton grande con icono protagonista.
 * Pensado para Senior (iconografia grande, objetivos tactiles amplios, colores distintos por modulo).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VitaliaIconComponent],
  selector: 'app-module-tile',
  template: `
    <button type="button" [class]="'tile tile--' + color() + ' tile--' + size()" (click)="opened.emit()">
      <span class="tile__icon" aria-hidden="true"><app-vitalia-icon [name]="icon()" [size]="size() === 'lg' ? 36 : 30" /></span>
      <span class="tile__text">
        <strong>{{ title() }}</strong>
        @if (description()) { <span>{{ description() }}</span> }
      </span>
      <span class="tile__arrow" aria-hidden="true"><app-vitalia-icon name="chevron-right" [size]="22" /></span>
    </button>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .tile { --tile-chip: var(--color-module-security); align-items: center; background: color-mix(in srgb, var(--tile-chip) 38%, white); border: 1px solid color-mix(in srgb, var(--tile-chip) 70%, transparent); border-radius: var(--radius-xl); box-shadow: var(--shadow-xs); color: var(--color-text); cursor: pointer; display: grid; gap: var(--space-3); grid-template-columns: auto minmax(0, 1fr) auto; min-height: 6rem; padding: var(--space-4); text-align: left; transition: box-shadow var(--motion-normal), transform var(--motion-normal), border-color var(--motion-normal); width: 100%; }
    .tile:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .tile:active { transform: translateY(0) scale(.99); }
    .tile--lg { min-height: 7.5rem; padding: var(--space-5); }
    .tile__icon { align-items: center; background: var(--tile-chip); border-radius: var(--radius-lg); color: var(--color-text); display: inline-flex; height: 3.75rem; justify-content: center; width: 3.75rem; }
    .tile--lg .tile__icon { height: 4.5rem; width: 4.5rem; }
    .tile__text { display: grid; gap: var(--space-1); min-width: 0; }
    .tile__text strong { font-size: var(--font-size-card-title); line-height: var(--line-height-tight); }
    .tile__text span { color: var(--color-text-on-tint); }
    .tile__arrow { color: var(--color-text-on-tint); }
    .tile--coral { --tile-chip: var(--color-module-health); }
    .tile--yellow { --tile-chip: var(--color-module-pensions); }
    .tile--lilac { --tile-chip: var(--color-module-selfcare); }
    .tile--green { --tile-chip: var(--color-module-security); }
    .tile--blue { --tile-chip: var(--color-module-entertainment); }
    .tile--turquoise { --tile-chip: var(--color-module-family); }
    .tile--teal { --tile-chip: var(--color-primary-soft); }
    @media (prefers-reduced-motion: reduce) { .tile, .tile:hover { transform: none; } }
  `,
})
export class ModuleTileComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly icon = input<VitaliaIconName>('sparkles');
  readonly color = input<ModuleTileColor>('green');
  readonly size = input<'md' | 'lg'>('md');
  readonly opened = output<void>();
}

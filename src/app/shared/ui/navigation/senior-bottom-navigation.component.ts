import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';
import { NavigationItem } from './navigation.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, VitaliaIconComponent],
  selector: 'app-senior-bottom-navigation',
  host: { '[class.is-preview]': 'preview()', '[style.--nav-count]': 'items().length + (moreLabel() ? 1 : 0)' },
  template: `
    <nav aria-label="Navegación principal">
      @for (item of items(); track item.label) {
        @if (item.disabled) {
          <button type="button" disabled title="Disponible próximamente"><app-vitalia-icon [name]="item.icon" [size]="23" /><span>{{ item.label }}</span></button>
        } @else {
          <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><app-vitalia-icon [name]="item.icon" [size]="23" /><span>{{ item.label }}</span></a>
        }
      }
      @if (moreLabel()) {
        <button type="button" class="more" [class.active]="moreExpanded()" [attr.aria-expanded]="moreExpanded()" aria-haspopup="dialog" (click)="morePressed.emit()"><app-vitalia-icon name="menu" [size]="23" /><span>{{ moreLabel() }}</span></button>
      }
    </nav>
  `,
  styles: `
    :host { bottom: 0; display: block; left: 0; position: fixed; right: 0; z-index: 25; }
    nav { backdrop-filter: blur(1rem); background: color-mix(in srgb, var(--color-surface) 94%, transparent); border-top: 1px solid var(--color-border); display: grid; grid-template-columns: repeat(var(--nav-count, 4), minmax(0, 1fr)); padding: var(--space-2) max(var(--space-2), env(safe-area-inset-right)) max(var(--space-2), env(safe-area-inset-bottom)) max(var(--space-2), env(safe-area-inset-left)); }
    a, button { align-items: center; background: transparent; border: 0; border-radius: var(--radius-md); color: var(--color-text-muted); display: flex; flex-direction: column; font-size: .72rem; font-weight: 700; gap: .2rem; justify-content: center; min-height: 3.5rem; min-width: 0; padding: .25rem; text-decoration: none; }
    a, .more { cursor: pointer; }
    a.active, .more.active { background: var(--color-primary-soft); color: var(--color-primary); }
    button:disabled { opacity: .45; }
    span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
    @media (min-width: 48rem) { :host { bottom: var(--space-4); left: 50%; max-width: 36rem; right: auto; transform: translateX(-50%); width: calc(100% - 2rem); } nav { border: 1px solid var(--color-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); } }
    :host(.is-preview) { bottom: auto; left: auto; max-width: none; position: static; right: auto; transform: none; width: 100%; }
    :host(.is-preview) nav { border: 1px solid var(--color-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); }
  `,
})
export class SeniorBottomNavigationComponent {
  readonly items = input.required<readonly NavigationItem[]>();
  readonly preview = input(false);
  /** Muestra un boton final (p. ej. "Más") que abre el menu completo. */
  readonly moreLabel = input<string | null>(null);
  readonly moreExpanded = input(false);
  readonly morePressed = output<void>();
}

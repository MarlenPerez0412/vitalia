import { afterNextRender, ChangeDetectionStrategy, Component, effect, ElementRef, HostListener, inject, Injector, input, output, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';
import { NavigationItem } from './navigation.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, VitaliaIconComponent],
  selector: 'app-mobile-drawer',
  host: { '[class.all-widths]': '!responsive()' },
  template: `
    @if (open()) {
      <button class="backdrop" type="button" aria-label="Cerrar menú" (click)="closed.emit()"></button>
      <aside #panel role="dialog" aria-modal="true" [attr.aria-label]="label()" (keydown)="trapFocus($event)">
        <div class="drawer-header"><a class="brand" [routerLink]="homePath()" (click)="closed.emit()"><img class="brand__logo" src="/vitalia-icon.jpg" alt="VITALIA" /><strong>VITALIA</strong></a><button type="button" aria-label="Cerrar menú" (click)="closed.emit()"><app-vitalia-icon name="close" /></button></div>
        <div class="identity">@if (photoUrl()) { <img class="identity__photo" [src]="photoUrl()!" [alt]="displayName()" /> } @else { <span aria-hidden="true">{{ displayName().charAt(0).toUpperCase() }}</span> }<div><strong>{{ displayName() }}</strong><small>{{ sectionName() }}</small></div></div>
        <nav aria-label="Navegación principal">@for (item of items(); track item.label) { <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closed.emit()"><app-vitalia-icon [name]="item.icon" /><span>{{ item.label }}</span></a> }</nav>
        <button class="logout" type="button" (click)="logoutPressed.emit()"><app-vitalia-icon name="logout" /><span>Cerrar sesión</span></button>
      </aside>
    }
  `,
  styleUrl: './mobile-drawer.component.scss',
})
export class MobileDrawerComponent {
  readonly open = input(false);
  readonly sectionName = input.required<string>();
  readonly displayName = input('');
  readonly photoUrl = input<string | null>(null);
  readonly homePath = input.required<string>();
  readonly items = input.required<readonly NavigationItem[]>();
  /** `false` lo mantiene disponible en todos los anchos (menu "Mas" de Senior). */
  readonly responsive = input(true);
  readonly label = input('Menú principal');
  readonly closed = output<void>();
  readonly logoutPressed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly injector = inject(Injector);
  private returnFocus: HTMLElement | null = null;

  constructor() {
    // Foco al primer enlace al abrir y de vuelta al disparador al cerrar.
    effect(() => {
      if (this.open()) {
        this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        afterNextRender(() => this.focusables()[1]?.focus(), { injector: this.injector });
      } else if (this.returnFocus) {
        const target = this.returnFocus;
        this.returnFocus = null;
        afterNextRender(() => { if (target.isConnected) target.focus(); }, { injector: this.injector });
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void { if (this.open()) this.closed.emit(); }

  protected trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = this.focusables();
    if (!items.length) return;
    const [first, last] = [items[0], items[items.length - 1]];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.panel()?.nativeElement.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
  }
}

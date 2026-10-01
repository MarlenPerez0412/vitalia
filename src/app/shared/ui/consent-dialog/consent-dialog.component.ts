import { afterNextRender, ChangeDetectionStrategy, Component, effect, ElementRef, inject, Injector, input, output, viewChild } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { VitaliaIconComponent, VitaliaIconName } from '../icon/vitalia-icon.component';

let nextId = 0;

/** Dialogo modal de consentimiento: focus trap, Escape para cerrar y retorno del foco al disparador. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, VitaliaIconComponent],
  selector: 'app-consent-dialog',
  template: `
    @if (open()) {
      <div class="backdrop" aria-hidden="true" (click)="dismissed.emit()"></div>
      <div #panel class="panel" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" [attr.aria-describedby]="descriptionId" (keydown)="onKeydown($event)">
        <span class="icon" [class.icon--danger]="tone() === 'danger'"><app-vitalia-icon [name]="icon()" [size]="30" /></span>
        <h2 [id]="titleId">{{ heading() }}</h2>
        <p [id]="descriptionId">{{ description() }}</p>
        <ng-content />
        @if (note()) { <p class="note"><app-vitalia-icon name="shield" [size]="18" />{{ note() }}</p> }
        <div class="actions">
          @if (customActions()) {
            <ng-content select="[dialogActions]" />
          } @else {
            <app-button [block]="true" [variant]="tone() === 'danger' ? 'emergency' : 'primary'" [icon]="icon()" (pressed)="confirmed.emit()">{{ confirmLabel() }}</app-button>
          }
          <app-button variant="ghost" [block]="true" (pressed)="dismissed.emit()">{{ dismissLabel() }}</app-button>
        </div>
      </div>
    }
  `,
  styleUrl: './consent-dialog.component.scss',
})
export class ConsentDialogComponent {
  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly note = input('');
  readonly icon = input<VitaliaIconName>('shield');
  readonly confirmLabel = input('Permitir');
  readonly dismissLabel = input('Ahora no');
  readonly tone = input<'default' | 'danger'>('default');
  /** Sustituye el boton de confirmar por el contenido `[dialogActions]` (p. ej. un enlace `tel:`). */
  readonly customActions = input(false);
  readonly confirmed = output<void>();
  readonly dismissed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly injector = inject(Injector);
  private returnFocus: HTMLElement | null = null;
  protected readonly titleId = `consent-title-${++nextId}`;
  protected readonly descriptionId = `consent-description-${nextId}`;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        afterNextRender(() => this.focusables()[0]?.focus(), { injector: this.injector });
      } else if (this.returnFocus) {
        const target = this.returnFocus;
        this.returnFocus = null;
        afterNextRender(() => { if (target.isConnected) target.focus(); }, { injector: this.injector });
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.dismissed.emit(); return; }
    if (event.key !== 'Tab') return;
    const items = this.focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.panel()?.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])') ?? []);
  }
}

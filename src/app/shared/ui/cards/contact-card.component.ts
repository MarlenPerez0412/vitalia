import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { CardShellComponent } from '../card-shell/card-shell.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, CardShellComponent],
  selector: 'app-contact-card',
  template: `
    <app-card-shell [interactive]="true" [disabled]="disabled()" [loading]="loading()">
      <span cardIcon class="avatar" aria-hidden="true">{{ initials() }}</span>
      <div><h3>{{ name() }}</h3><p>{{ relationship() }}</p>@if (availability()) { <small>{{ availability() }}</small> }</div>
      <div cardActions>
        <app-button variant="secondary" icon="phone" [disabled]="disabled()" (pressed)="called.emit()">Llamar</app-button>
        @if (showMessage()) { <app-button variant="ghost" [disabled]="disabled()" (pressed)="messaged.emit()">Mensaje</app-button> }
      </div>
    </app-card-shell>
  `,
  styles: `
    .avatar { align-items: center; background: var(--color-secondary-soft); border-radius: 50%; color: var(--color-secondary-hover); display: inline-flex; font-size: 1.05rem; font-weight: 850; height: 3rem; justify-content: center; width: 3rem; }
    h3 { font-size: var(--font-size-card-title); margin: 0; }
    p, small { color: var(--color-text-muted); display: block; margin: var(--space-1) 0 0; }
  `,
})
export class ContactCardComponent {
  readonly name = input.required<string>();
  readonly relationship = input.required<string>();
  readonly availability = input('');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly showMessage = input(false);
  readonly called = output<void>();
  readonly messaged = output<void>();
  protected initials(): string { return this.name().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase(); }
}

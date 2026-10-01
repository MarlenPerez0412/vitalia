import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type CardTone = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-card-shell',
  template: `
    <article [class]="'card card--' + tone()" [class.card--interactive]="interactive()" [class.card--disabled]="disabled()" [attr.aria-busy]="loading()">
      @if (loading()) {
        <div class="skeleton skeleton--short"></div><div class="skeleton"></div><div class="skeleton skeleton--medium"></div>
      } @else {
        <div class="card__top"><ng-content select="[cardIcon]" /><div class="card__meta"><ng-content select="[cardMeta]" /></div></div>
        <div class="card__body"><ng-content /></div>
        <div class="card__actions"><ng-content select="[cardActions]" /></div>
      }
    </article>
  `,
  styleUrl: './card-shell.component.scss',
})
export class CardShellComponent {
  readonly tone = input<CardTone>('default');
  readonly interactive = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);
}

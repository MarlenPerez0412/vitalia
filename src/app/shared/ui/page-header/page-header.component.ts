import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-page-header',
  template: `
    <header>
      <div>
        @if (eyebrow()) { <p class="eyebrow">{{ eyebrow() }}</p> }
        <h1>{{ title() }}</h1>
        @if (description()) { <p class="description">{{ description() }}</p> }
      </div>
      <div class="actions"><ng-content /></div>
    </header>
  `,
  styles: `
    :host { display: block; }
    header { align-items: flex-start; display: flex; flex-wrap: wrap; gap: var(--space-4); justify-content: space-between; min-width: 0; }
    header > div:first-child { flex: 1 1 18rem; min-width: 0; }
    .eyebrow { color: var(--color-primary); font-size: var(--font-size-caption); font-weight: 850; letter-spacing: .1em; margin: 0 0 var(--space-2); text-transform: uppercase; }
    h1 { font-size: var(--font-size-heading); line-height: var(--line-height-tight); margin: 0; }
    .description { color: var(--color-text-muted); font-size: var(--font-size-lead); margin: var(--space-2) 0 0; max-width: 52rem; }
    .actions { align-items: center; display: flex; flex: 0 1 auto; flex-wrap: wrap; gap: var(--space-2); }
    .actions:empty { display: none; }
  `,
})
export class PageHeaderComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly description = input('');
}

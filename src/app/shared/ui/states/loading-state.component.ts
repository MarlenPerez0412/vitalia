import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-loading-state',
  template: `<section role="status" aria-live="polite"><span class="loader" aria-hidden="true"></span><h2>{{ title() }}</h2><p>{{ description() }}</p></section>`,
  styleUrl: './state.component.scss',
})
export class LoadingStateComponent {
  readonly title = input('Preparando tu información');
  readonly description = input('Esto tomará solo un momento.');
}

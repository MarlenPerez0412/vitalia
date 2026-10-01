import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from '@angular/core';
import { NavigationService } from '../../../../core/services/navigation.service';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [AppButtonComponent, PageHeaderComponent],
  selector: 'app-senior-page',
  template: `
    <section class="senior-page">
      @if (backPath()) { <app-button variant="ghost" icon="chevron-left" (pressed)="goBack()">Volver</app-button> }
      <app-page-header [eyebrow]="eyebrow()" [title]="title()" [description]="description()"><ng-content select="[pageActions]" /></app-page-header>
      <div class="senior-page__content"><ng-content /></div>
    </section>
  `,
  styleUrl: './senior-page.component.scss',
})
export class SeniorPageComponent {
  readonly eyebrow = input('Mi espacio');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly backPath = input('');
  private readonly navigation = inject(NavigationService);
  protected goBack(): void { void this.navigation.goTo(this.backPath()); }
}

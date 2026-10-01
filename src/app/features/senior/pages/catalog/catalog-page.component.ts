import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SENIOR_CATALOGS } from '../../../../core/services/senior-mock-data';
import { ModuleTileComponent } from '../../../../shared/ui/cards/module-tile.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { CatalogItem } from '../../models/senior.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModuleTileComponent, SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-senior-catalog-page',
  template: `
    <app-senior-page [eyebrow]="catalog.eyebrow" [title]="catalog.title" [description]="catalog.description">
      @if (notice()) { <div class="senior-page__notice" role="status"><app-vitalia-icon name="check" /><p><strong>Acción simulada</strong><span>{{ notice() }}</span></p></div> }
      <div class="senior-page__grid">
        @for (item of catalog.items; track item.title) {
          <app-module-tile [title]="item.title" [description]="item.description" [icon]="item.icon" [color]="catalog.color" (opened)="open(item)" />
        }
      </div>
    </app-senior-page>
  `,
})
export class CatalogPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogKey = this.route.snapshot.data['catalogKey'] as string;
  protected readonly catalog = SENIOR_CATALOGS[this.catalogKey];
  protected readonly notice = signal('');

  protected open(item: CatalogItem): void {
    if (item.route) {
      void this.router.navigateByUrl(item.route);
      return;
    }
    this.notice.set(`${item.title} usa información ficticia y quedará conectado en una fase posterior.`);
  }
}

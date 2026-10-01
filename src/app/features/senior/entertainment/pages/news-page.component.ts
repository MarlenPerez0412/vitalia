import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { formatDate, loadContent, openExternal } from '../content-resource';
import { EntertainmentCardComponent } from '../entertainment-card.component';
import { EntertainmentSectionComponent } from '../entertainment-section.component';
import { NewsService } from '../entertainment.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntertainmentCardComponent, EntertainmentSectionComponent],
  selector: 'app-news-page',
  template: `
    <app-entertainment-section title="Noticias" description="Lecturas tranquilas sobre cultura, bienestar y comunidad." [loading]="content.loading()" [fallback]="content.result().fallback">
      @for (item of content.result().items; track item.id) {
        <app-entertainment-card [title]="item.title" [description]="item.summary" icon="activity" [image]="item.image ?? ''" [imageAlt]="'Imagen de ' + item.title"
          [meta]="[item.category, item.source, fecha(item.date)]" actionLabel="Leer más" expandedLabel="Ocultar" variant="poster">
          <p>{{ item.details }}</p>
          @if (item.url) { <button type="button" class="link" (click)="open(item.url)">Abrir la nota completa</button> }
        </app-entertainment-card>
      }
    </app-entertainment-section>
  `,
  styles: `.link { background: none; border: 0; color: var(--color-primary); cursor: pointer; font-weight: 800; justify-self: start; min-height: var(--touch-target); padding: 0; text-decoration: underline; }`,
})
export class NewsPageComponent {
  protected readonly content = loadContent(() => inject(NewsService).getNews());
  protected readonly fecha = formatDate;
  protected open(url: string): void { openExternal(url); }
}

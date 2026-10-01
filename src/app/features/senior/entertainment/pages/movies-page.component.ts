import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { loadContent } from '../content-resource';
import { EntertainmentCardComponent } from '../entertainment-card.component';
import { EntertainmentSectionComponent } from '../entertainment-section.component';
import { MovieService } from '../entertainment.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntertainmentCardComponent, EntertainmentSectionComponent],
  selector: 'app-movies-page',
  template: `
    <app-entertainment-section title="Películas" description="Una selección para ver con calma, sola o en familia." [loading]="content.loading()" [fallback]="content.result().fallback">
      @for (movie of content.result().items; track movie.id) {
        <app-entertainment-card [title]="movie.title" [description]="movie.synopsis" icon="sparkles" [image]="movie.poster ?? ''" [imageAlt]="'Póster de ' + movie.title"
          [meta]="meta(movie)" actionLabel="Ver detalles" expandedLabel="Ocultar detalles" variant="poster">
          <p>{{ movie.details }}</p>
        </app-entertainment-card>
      }
    </app-entertainment-section>
  `,
})
export class MoviesPageComponent {
  protected readonly content = loadContent(() => inject(MovieService).getMovies());
  protected meta(movie: { year: number; genre: string; rating?: string }): string[] {
    return [String(movie.year), movie.genre, ...(movie.rating ? [`Clasificación ${movie.rating}`] : [])];
  }
}

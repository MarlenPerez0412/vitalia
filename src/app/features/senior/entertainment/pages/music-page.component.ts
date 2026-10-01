import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { loadContent, openExternal } from '../content-resource';
import { EntertainmentCardComponent } from '../entertainment-card.component';
import { EntertainmentSectionComponent } from '../entertainment-section.component';
import { MusicService } from '../entertainment.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntertainmentCardComponent, EntertainmentSectionComponent],
  selector: 'app-music-page',
  template: `
    <app-entertainment-section title="Música" description="Escucha tus géneros favoritos. Se abre en otra pestaña." [loading]="content.loading()" [fallback]="content.result().fallback">
      @for (track of content.result().items; track track.id) {
        <app-entertainment-card [title]="track.title" [description]="track.artist" icon="heart" [image]="track.thumbnail ?? ''" [imageAlt]="'Portada de ' + track.title"
          [meta]="[track.category]" actionLabel="Reproducir" actionIcon="play" [toggle]="false" variant="poster" (action)="play(track.url)" />
      }
    </app-entertainment-section>
  `,
})
export class MusicPageComponent {
  protected readonly content = loadContent(() => inject(MusicService).getTracks());
  protected play(url: string): void { openExternal(url); }
}

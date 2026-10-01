import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { formatDate, loadContent, openExternal } from '../content-resource';
import { EntertainmentCardComponent } from '../entertainment-card.component';
import { EntertainmentSectionComponent } from '../entertainment-section.component';
import { EventsService } from '../entertainment.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntertainmentCardComponent, EntertainmentSectionComponent],
  selector: 'app-theater-page',
  template: `
    <app-entertainment-section title="Teatro" description="Cartelera cultural para disfrutar cerca de ti." [loading]="content.loading()" [fallback]="content.result().fallback">
      @for (event of content.result().items; track event.id) {
        <app-entertainment-card [title]="event.name" [description]="event.description" icon="users" [image]="event.image ?? ''" [imageAlt]="'Imagen de ' + event.name"
          [meta]="[event.type, fecha(event.date), event.time + ' h']" actionLabel="Ver información" expandedLabel="Ocultar información" variant="poster">
          <dl class="senior-page__detail-list">
            <div><dt>Fecha</dt><dd>{{ fecha(event.date) }}</dd></div>
            <div><dt>Hora</dt><dd>{{ event.time }} h</dd></div>
            <div><dt>Recinto</dt><dd>{{ event.venue }}</dd></div>
            <div><dt>Ciudad</dt><dd>{{ event.city }}</dd></div>
          </dl>
          @if (event.url) { <button type="button" class="link" (click)="open(event.url)">Ver sitio del evento</button> }
        </app-entertainment-card>
      }
    </app-entertainment-section>
  `,
  styles: `.link { background: none; border: 0; color: var(--color-primary); cursor: pointer; font-weight: 800; justify-self: start; min-height: var(--touch-target); padding: 0; text-decoration: underline; }`,
})
export class TheaterPageComponent {
  protected readonly content = loadContent(() => inject(EventsService).getEvents());
  protected readonly fecha = formatDate;
  protected open(url: string): void { openExternal(url); }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { loadContent } from '../content-resource';
import { EntertainmentCardComponent } from '../entertainment-card.component';
import { EntertainmentSectionComponent } from '../entertainment-section.component';
import { ActivitiesService } from '../entertainment.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntertainmentCardComponent, EntertainmentSectionComponent],
  selector: 'app-activities-page',
  template: `
    <app-entertainment-section title="Actividades recreativas" description="Ideas accesibles para disfrutar tu tiempo libre." [loading]="content.loading()" [fallback]="content.result().fallback">
      @for (activity of content.result().items; track activity.id) {
        <app-entertainment-card [title]="activity.name" [description]="activity.description" icon="users" [image]="activity.image ?? ''" [imageAlt]="'Imagen de ' + activity.name"
          [meta]="[activity.category, activity.duration]" actionLabel="Ver actividad" expandedLabel="Ocultar actividad" variant="poster">
          <dl class="senior-page__detail-list">
            <div><dt>Duración</dt><dd>{{ activity.duration }}</dd></div>
            <div><dt>Ubicación</dt><dd>{{ activity.location }}</dd></div>
            <div><dt>Movilidad</dt><dd>{{ activity.mobility }}</dd></div>
          </dl>
        </app-entertainment-card>
      }
    </app-entertainment-section>
  `,
})
export class ActivitiesPageComponent {
  protected readonly content = loadContent(() => inject(ActivitiesService).getActivities());
}

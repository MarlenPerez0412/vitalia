import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { loadContent } from '../content-resource';
import { EntertainmentCardComponent } from '../entertainment-card.component';
import { EntertainmentSectionComponent } from '../entertainment-section.component';
import { CraftsService } from '../entertainment.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntertainmentCardComponent, EntertainmentSectionComponent],
  selector: 'app-crafts-page',
  template: `
    <app-entertainment-section title="Manualidades" description="Proyectos sencillos, paso a paso y a tu ritmo." [loading]="content.loading()" [fallback]="content.result().fallback">
      @for (craft of content.result().items; track craft.id) {
        <app-entertainment-card [title]="craft.name" [description]="craft.description" [icon]="craft.icon" [image]="craft.image ?? ''" [imageAlt]="'Foto de ' + craft.name"
          [meta]="['Dificultad: ' + craft.difficulty, craft.duration]" actionLabel="Comenzar" expandedLabel="Cerrar instrucciones" variant="poster">
          <h3>Materiales</h3>
          <ul>@for (material of craft.materials; track material) { <li>{{ material }}</li> }</ul>
          <h3>Paso a paso</h3>
          <ol>@for (step of craft.steps; track step) { <li>{{ step }}</li> }</ol>
        </app-entertainment-card>
      }
    </app-entertainment-section>
  `,
  styles: `h3 { margin: 0; } ul, ol { display: grid; gap: var(--space-2); margin: 0; padding-left: 1.4rem; }`,
})
export class CraftsPageComponent {
  protected readonly content = loadContent(() => inject(CraftsService).getCrafts());
}

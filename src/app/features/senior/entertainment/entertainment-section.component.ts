import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { SeniorPageComponent } from '../components/senior-page/senior-page.component';
import { FALLBACK_MESSAGE } from './entertainment.models';

export const ENTERTAINMENT_PATH = '/senior/entertainment';

/**
 * Marco de cada pantalla interna: boton «Volver» que navega SIEMPRE a /senior/entertainment (no usa el historial),
 * estado de carga y aviso amable cuando se muestran datos locales por un error de la API.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-entertainment-section',
  template: `
    <app-senior-page eyebrow="Entretenimiento" [title]="title()" [description]="description()" [backPath]="entertainmentPath">
      @if (fallback()) { <div class="senior-page__notice senior-page__notice--warning" role="status"><app-vitalia-icon name="alert" /><p>{{ message }}</p></div> }
      @if (loading()) { <p class="loading" role="status">Cargando contenido…</p> }
      @else { <div class="senior-page__grid senior-page__grid--wide"><ng-content /></div> }
    </app-senior-page>
  `,
  styles: `.loading { color: var(--color-text-muted); font-weight: 700; margin: 0; }`,
})
export class EntertainmentSectionComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly loading = input(false);
  readonly fallback = input(false);
  protected readonly entertainmentPath = ENTERTAINMENT_PATH;
  protected readonly message = FALLBACK_MESSAGE;
}

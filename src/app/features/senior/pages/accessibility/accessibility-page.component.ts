import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LANGUAGE_VARIANTS, variantInfo } from '../../../../core/i18n/language-variants';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { AccessibilityMode } from '../../models/senior.models';
import { AccessibilityPreferencesService } from '../../services/accessibility-preferences.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, SeniorPageComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-accessibility-page',
  template: `
    <app-senior-page eyebrow="Una experiencia para ti" title="Accesibilidad" description="Prueba modos visuales funcionales. La preferencia se guarda en este dispositivo." backPath="/senior/profile">
      <div class="mode-grid">
        @for (mode of modes; track mode.id) {
          <button type="button" [class.selected]="preferences.mode() === mode.id" [attr.aria-pressed]="preferences.mode() === mode.id" (click)="preferences.setMode(mode.id)">
            <span class="icon"><app-vitalia-icon [name]="mode.icon" /></span><span><strong>{{ mode.label }}</strong><small>{{ mode.description }}</small></span>
            @if (preferences.mode() === mode.id) { <app-status-badge variant="success">Activo</app-status-badge> }
          </button>
        }
      </div>
      <section class="senior-page__panel" aria-labelledby="lia-voice">
        <h2 id="lia-voice">Voz de LIA</h2>
        <p>LIA lee sus respuestas en voz alta. Si la desactivas, los comandos de voz siguen funcionando y verás los mensajes en pantalla.</p>
        <div class="senior-page__actions" aria-live="polite">
          <app-status-badge [variant]="preferences.liaVoice() ? 'success' : 'normal'">{{ preferences.liaVoice() ? 'Activada' : 'Desactivada' }}</app-status-badge>
          <!-- Un solo boton: conserva el foco al cambiar de estado. -->
          <app-button [variant]="preferences.liaVoice() ? 'ghost' : 'voice'" [icon]="preferences.liaVoice() ? 'close' : 'sparkles'" (pressed)="preferences.setLiaVoice(!preferences.liaVoice())">
            {{ preferences.liaVoice() ? 'Desactivar voz de LIA' : 'Activar voz de LIA' }}
          </app-button>
        </div>
        @if (!preferences.liaVoiceSupported) { <p>Este navegador no permite que LIA hable; seguirás viendo sus mensajes.</p> }
      </section>
      <section class="senior-page__panel" aria-labelledby="lia-language">
        <h2 id="lia-language">Idioma de VITALIA</h2>
        <p>LIA te responde en el mismo idioma en que le hablas o le escribes.</p>
        <div class="senior-page__choice-grid" role="group" aria-labelledby="lia-language">
          @for (option of languageOptions; track option.id) {
            <button type="button" class="senior-page__choice" [class.selected]="preferences.liaLanguage() === option.id"
              [attr.aria-pressed]="preferences.liaLanguage() === option.id" (click)="preferences.setLanguage(option.id)">{{ option.label }}{{ option.status === 'pilot' ? ' (piloto)' : '' }}</button>
          }
        </div>
        @if (selected().status === 'pilot') {
          <p>Piloto con frases predeterminadas para el MVP: próximo medicamento, pedir ayuda y llamar a tu hija. Aún no las han validado hablantes nativos.</p>
          <p>Reconocimiento de voz experimental: no hay modelo de {{ selected().shortLabel }}; tu voz se aproxima con el reconocedor en español. Si no te entiendo, puedes repetir, usar español o los botones.</p>
          <p>Las respuestas se muestran en texto: todavía no hay una voz nativa en {{ selected().shortLabel }}, y LIA no las lee con la voz española.</p>
          <div class="senior-page__actions" aria-live="polite">
            <app-status-badge [variant]="preferences.allowSpanishFallback() ? 'attention' : 'normal'">{{ preferences.allowSpanishFallback() ? 'Respaldo en español permitido' : 'Sin voz en español' }}</app-status-badge>
            <app-button variant="ghost" (pressed)="preferences.setAllowSpanishFallback(!preferences.allowSpanishFallback())">
              {{ preferences.allowSpanishFallback() ? 'No leer en español' : 'Leer en español los mensajes que aún no existen en este idioma' }}
            </app-button>
          </div>
        }
      </section>
      <div class="preview"><p class="eyebrow">Vista previa</p><h2>María, tu bienestar es lo primero.</h2><p>Los textos, espacios y acciones se adaptan sin cambiar tu información.</p><div><span>Acción principal</span><span class="secondary-action">Acción secundaria</span></div></div>
    </app-senior-page>
  `,
  styleUrl: './accessibility-page.component.scss',
})
export class AccessibilityPageComponent {
  protected readonly preferences = inject(AccessibilityPreferencesService);
  /** Español (predeterminado), Náhuatl (piloto) y Zapoteco (piloto). */
  protected readonly languageOptions = LANGUAGE_VARIANTS;
  protected readonly selected = computed(() => variantInfo(this.preferences.liaLanguage()));
  protected readonly modes: readonly { id: AccessibilityMode; label: string; description: string; icon: 'user' | 'activity' | 'microphone' | 'sparkles' }[] = [
    { id: 'standard', label: 'Estándar', description: 'Tamaño y densidad equilibrados.', icon: 'user' },
    { id: 'accessible', label: 'Accesible', description: 'Texto mayor y objetivos más amplios.', icon: 'activity' },
    { id: 'assisted', label: 'Asistido', description: 'Prioriza las acciones de voz y acompañamiento.', icon: 'microphone' },
    { id: 'simplified', label: 'Simplificado', description: 'Reduce acciones secundarias y distracciones.', icon: 'sparkles' },
  ];
}


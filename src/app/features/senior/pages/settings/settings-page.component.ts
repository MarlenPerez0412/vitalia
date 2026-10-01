import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { VitaliaPermissionState } from '../../../../core/models/permission.models';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../../shared/ui/status-badge/status-badge.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { VoiceCommandService } from '../../services/voice-command.service';

const PERMISSION_LABELS: Record<VitaliaPermissionState, { label: string; tone: StatusBadgeVariant }> = {
  prompt: { label: 'Se preguntará al usarlo', tone: 'normal' },
  granted: { label: 'Permitido', tone: 'success' },
  denied: { label: 'Bloqueado en el navegador', tone: 'urgent' },
  unavailable: { label: 'No disponible', tone: 'attention' },
  error: { label: 'No se pudo comprobar', tone: 'attention' },
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, SeniorPageComponent, StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-settings-page',
  template: `
    <app-senior-page eyebrow="Preferencias" title="Configuración" description="Tú decides cómo te acompaña VITALIA." backPath="/senior/profile">
      <section class="senior-page__panel" aria-labelledby="voice-settings">
        <h2 id="voice-settings">Comandos de voz</h2>
        <p>Di «LIA» seguido de una instrucción desde cualquier pantalla. Solo escuchan mientras están activos y VITALIA está a la vista.</p>
        <div class="senior-page__actions">
          <app-status-badge [variant]="voice.enabled() ? 'success' : 'normal'">{{ voice.enabled() ? 'Activos' : 'Desactivados' }}</app-status-badge>
          @if (voice.enabled()) { <app-button variant="ghost" icon="close" (pressed)="voice.disable()">Desactivar</app-button> }
          @else { <app-button variant="voice" icon="microphone" (pressed)="voice.requestEnable()">Activar comandos de voz</app-button> }
          <app-button variant="secondary" (pressed)="go('/senior/settings/voice-commands')">Personalizar comandos</app-button>
        </div>
        <p class="examples">Ejemplos: «LIA, necesito ayuda», «LIA, me siento mal», «LIA, llama a mi hija», «LIA, ¿dónde estoy?», «LIA, ¿qué medicamento me toca?».</p>
      </section>

      <section class="senior-page__panel" aria-labelledby="browser-permissions">
        <h2 id="browser-permissions">Permisos del navegador</h2>
        <p>VITALIA nunca los pide al abrir la aplicación: solo cuando tú usas la función.</p>
        <dl class="senior-page__detail-list">
          <div><dt><app-vitalia-icon name="microphone" [size]="18" /> Micrófono</dt><dd><app-status-badge [variant]="microphone().tone">{{ microphone().label }}</app-status-badge></dd></div>
          <div><dt><app-vitalia-icon name="map-pin" [size]="18" /> Ubicación</dt><dd><app-status-badge [variant]="geolocation().tone">{{ geolocation().label }}</app-status-badge></dd></div>
        </dl>
        <app-button variant="ghost" (pressed)="refresh()">Comprobar de nuevo</app-button>
      </section>

      <div class="senior-page__grid">
        <app-button variant="secondary" icon="sparkles" [block]="true" (pressed)="go('/senior/accessibility')">Accesibilidad</app-button>
        <app-button variant="secondary" icon="lock" [block]="true" (pressed)="go('/senior/privacy')">Privacidad</app-button>
      </div>
    </app-senior-page>
  `,
  styles: `
    .examples { color: var(--color-text-muted); font-size: var(--font-size-small); margin: var(--space-3) 0 0; }
    dt { align-items: center; display: flex; gap: var(--space-2); }
    section h2 { font-size: var(--font-size-card-title); }
  `,
})
export class SettingsPageComponent {
  protected readonly voice = inject(VoiceCommandService);
  private readonly permissions = inject(PermissionsService);
  private readonly router = inject(Router);
  protected readonly microphone = computed(() => PERMISSION_LABELS[this.permissions.microphone()]);
  protected readonly geolocation = computed(() => PERMISSION_LABELS[this.permissions.geolocation()]);

  constructor() { void this.refresh(); }

  /** Solo consulta el estado (`navigator.permissions`); nunca abre el dialogo del navegador. */
  protected async refresh(): Promise<void> {
    await Promise.all([this.permissions.checkMicrophonePermission(), this.permissions.checkLocationPermission()]);
  }

  protected go(path: string): void { void this.router.navigateByUrl(path); }
}

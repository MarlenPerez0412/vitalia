import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SeniorLayoutComponent } from '../../../../core/layout/senior-layout/senior-layout.component';
import { LiaSpeechService } from '../../../../core/services/lia-speech.service';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { EmergencyService } from '../../services/emergency.service';
import { VoiceCommandService } from '../../services/voice-command.service';
import { VoiceCommandBarComponent } from '../voice-command-bar/voice-command-bar.component';
import { VoiceCommandDialogsComponent } from '../voice-command-bar/voice-command-dialogs.component';

/** Ruta raiz de Senior: layout + comandos de voz + aviso de emergencia en curso. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, RouterOutlet, SeniorLayoutComponent, VitaliaIconComponent, VoiceCommandBarComponent, VoiceCommandDialogsComponent],
  selector: 'app-senior-shell',
  template: `
    <app-senior-layout>
      <div layoutBanner class="banner-slot">
        @if (showEmergencyBanner()) {
          <div class="emergency-banner" role="status">
            <app-vitalia-icon name="emergency" [size]="22" />
            <p><strong>Solicitud de ayuda en curso</strong><span>Puedes revisarla o cancelarla.</span></p>
            <app-button variant="emergency" (pressed)="goEmergency()">Ver solicitud</app-button>
          </div>
        }
      </div>
      <router-outlet />
      <app-voice-command-bar layoutAside />
      <app-voice-command-dialogs layoutOverlay />
    </app-senior-layout>
  `,
  styles: `
    :host { display: block; }
    .banner-slot:empty { display: none; }
    .emergency-banner { align-items: center; background: var(--color-emergency-soft); border-bottom: 2px solid var(--color-emergency); color: var(--color-emergency-hover); display: flex; flex-wrap: wrap; gap: var(--space-3); padding: var(--space-3) var(--page-gutter); position: sticky; top: var(--topbar-height); z-index: 19; }
    .emergency-banner p { flex: 1; margin: 0; min-width: 12rem; }
    .emergency-banner strong, .emergency-banner span { display: block; }
    .emergency-banner span { color: var(--color-text-muted); }
  `,
})
export class SeniorShellComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly emergency = inject(EmergencyService);
  private readonly voice = inject(VoiceCommandService);
  private readonly speech = inject(LiaSpeechService);
  private readonly url = toSignal(this.router.events.pipe(filter((event) => event instanceof NavigationEnd), map(() => this.router.url)), { initialValue: this.router.url });
  protected readonly showEmergencyBanner = computed(() => this.emergency.inProgress() && !this.url().startsWith('/senior/emergency'));

  protected goEmergency(): void { void this.router.navigateByUrl('/senior/emergency'); }

  /** Al salir de Senior (p. ej. cerrar sesion) se libera el microfono y se descarta cualquier flujo en curso. */
  ngOnDestroy(): void {
    this.voice.disable();
    this.speech.stop();
    this.emergency.reset();
  }
}

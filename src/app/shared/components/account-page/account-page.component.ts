import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLE_LABELS } from '../../../core/models/access.models';
import { PageHeaderComponent } from '../../ui/page-header/page-header.component';
import { StatusBadgeComponent } from '../../ui/status-badge/status-badge.component';

/** "Mi perfil" y "Configuración" para los paneles Care, Health y Admin (`data.mode`: 'profile' | 'settings'). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, StatusBadgeComponent],
  selector: 'app-account-page',
  template: `
    <section class="account">
      @if (mode === 'profile') {
        <app-page-header eyebrow="Mi cuenta" title="Mi perfil" description="Datos de tu cuenta en VITALIA." />
        @if (user(); as user) {
          <div class="identity">
            <span class="avatar" aria-hidden="true">{{ user.displayName.charAt(0).toUpperCase() }}</span>
            <div><h2>{{ user.displayName }}</h2><p>{{ roleLabel() }}</p></div>
          </div>
          <dl class="details">
            <div><dt>Correo</dt><dd>{{ user.email }}</dd></div>
            <div><dt>Rol</dt><dd>{{ roleLabel() }}</dd></div>
            <div><dt>Estado</dt><dd><app-status-badge [variant]="user.active ? 'success' : 'attention'">{{ user.active ? 'Activa' : 'Inactiva' }}</app-status-badge></dd></div>
            <div><dt>Autenticación</dt><dd>Modo demostración (preparado para Supabase Auth)</dd></div>
          </dl>
        }
      } @else {
        <app-page-header eyebrow="Mi cuenta" title="Configuración" description="Preferencias de tu panel. Los cambios reales llegarán con el backend." />
        <dl class="details">
          <div><dt>Idioma</dt><dd>Español (México)</dd></div>
          <div><dt>Notificaciones</dt><dd><app-status-badge variant="pending">Próximamente</app-status-badge></dd></div>
          <div><dt>Privacidad</dt><dd>Solo ves la información que cada persona autorizó.</dd></div>
          <div><dt>Sesión</dt><dd>Se cierra desde el menú de tu cuenta.</dd></div>
        </dl>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .account { display: grid; gap: var(--space-6); max-width: 48rem; min-width: 0; }
    .identity { align-items: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); display: flex; gap: var(--space-4); padding: var(--space-5); }
    .avatar { align-items: center; background: linear-gradient(145deg, var(--color-primary), var(--color-secondary)); border-radius: 50%; color: var(--color-on-primary); display: inline-flex; flex: 0 0 4.5rem; font-size: 1.6rem; font-weight: 900; height: 4.5rem; justify-content: center; }
    .identity h2 { font-size: var(--font-size-card-title); margin: 0; }
    .identity p { color: var(--color-text-muted); margin: var(--space-1) 0 0; }
    .details { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); margin: 0; padding: var(--space-2) var(--space-5); }
    .details > div { border-bottom: 1px solid var(--color-border); display: grid; gap: var(--space-1) var(--space-4); grid-template-columns: minmax(0, 1fr); padding: var(--space-3) 0; }
    .details > div:last-child { border-bottom: 0; }
    dt { color: var(--color-text-muted); font-weight: 700; }
    dd { font-weight: 750; margin: 0; overflow-wrap: anywhere; }
    @media (min-width: 40rem) { .details > div { grid-template-columns: 12rem minmax(0, 1fr); } }
  `,
})
export class AccountPageComponent {
  private readonly auth = inject(AuthService);
  protected readonly mode = (inject(ActivatedRoute).snapshot.data['mode'] as 'profile' | 'settings' | undefined) ?? 'profile';
  protected readonly user = this.auth.currentUser;
  protected readonly roleLabel = computed(() => { const role = this.user()?.role; return role ? ROLE_LABELS[role] : ''; });
}

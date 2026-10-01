import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { EmergencyButtonComponent } from '../../../shared/ui/emergency-button/emergency-button.component';
import { VitaliaIconComponent } from '../../../shared/ui/icon/vitalia-icon.component';
import { MobileDrawerComponent } from '../../../shared/ui/navigation/mobile-drawer.component';
import { NavigationItem } from '../../../shared/ui/navigation/navigation.models';
import { SeniorBottomNavigationComponent } from '../../../shared/ui/navigation/senior-bottom-navigation.component';
import { TopbarComponent } from '../../../shared/ui/navigation/topbar.component';

/** Menu principal Senior completo (drawer "Más"). */
export const SENIOR_NAVIGATION: readonly NavigationItem[] = [
  { label: 'Inicio', path: '/senior', icon: 'home' },
  { label: 'LIA', path: '/senior/lia', icon: 'microphone' },
  { label: 'Salud', path: '/senior/health', icon: 'heart' },
  { label: 'Bienestar', path: '/senior/wellbeing', icon: 'sparkles' },
  { label: 'Seguridad', path: '/senior/security', icon: 'shield' },
  { label: 'Familia', path: '/senior/family', icon: 'users' },
  { label: 'Pensiones y trámites', path: '/senior/pensions', icon: 'wallet' },
  { label: 'Autocuidado', path: '/senior/self-care', icon: 'brain' },
  { label: 'Entretenimiento', path: '/senior/entertainment', icon: 'play' },
  { label: 'Perfil', path: '/senior/profile', icon: 'user' },
];

/**
 * Estructura Senior (mobile-first): topbar, contenido, ayuda siempre visible y navegacion inferior con "Más".
 * La feature proyecta su contenido: `[layoutBanner]`, `[layoutAside]` y `[layoutOverlay]` (dialogos).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmergencyButtonComponent, MobileDrawerComponent, SeniorBottomNavigationComponent, TopbarComponent, VitaliaIconComponent],
  selector: 'app-senior-layout',
  template: `
    <div class="senior-shell">
      <app-topbar title="Mi espacio" subtitle="Bienestar y autonomía" homePath="/senior" />
      <ng-content select="[layoutBanner]" />
      <div class="senior-content">
        <main><ng-content /></main>
        <aside aria-label="Ayuda y privacidad">
          <app-emergency-button (activated)="openEmergency()" />
          <ng-content select="[layoutAside]" />
          <div class="privacy"><app-vitalia-icon name="shield" [size]="22" /><p><strong>No vigilamos. Acompañamos.</strong><span>Tu información solo se comparte con tu autorización.</span></p></div>
        </aside>
      </div>
      <app-senior-bottom-navigation [items]="primaryNav" moreLabel="Más" [moreExpanded]="menuOpen()" (morePressed)="menuOpen.set(true)" />
      <app-mobile-drawer [open]="menuOpen()" [responsive]="false" label="Menú de VITALIA" sectionName="Mi espacio"
        [displayName]="auth.currentUser()?.displayName ?? ''" homePath="/senior" [items]="fullNav"
        photoUrl="https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=200&h=200&fit=crop&crop=face"
        (closed)="menuOpen.set(false)" (logoutPressed)="logout()" />
      <ng-content select="[layoutOverlay]" />
    </div>
  `,
  styleUrl: './senior-layout.component.scss',
})
export class SeniorLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly fullNav = SENIOR_NAVIGATION;
  protected readonly primaryNav = SENIOR_NAVIGATION.slice(0, 4);
  protected readonly menuOpen = signal(false);

  protected openEmergency(): void { void this.router.navigate(['/senior/emergency']); }
  protected logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}

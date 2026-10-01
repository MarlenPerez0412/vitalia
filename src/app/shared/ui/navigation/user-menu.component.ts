import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLE_LABELS } from '../../../core/models/access.models';
import { Role } from '../../../core/models/domain.models';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';

export interface UserMenuData {
  name: string;
  email: string;
  role: string;
  avatarInitial: string;
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

/** Destinos de cuenta por rol (ver docs/ROUTES.md). */
const ACCOUNT_PATHS: Partial<Record<Role, { profile: string; settings: string }>> = {
  SENIOR: { profile: '/senior/profile', settings: '/senior/settings' },
  CAREGIVER: { profile: '/care/profile', settings: '/care/settings' },
  HEALTH: { profile: '/health/profile', settings: '/health/settings' },
  ADMIN: { profile: '/admin/profile', settings: '/admin/settings' },
};

let nextId = 0;

/**
 * Menu de cuenta reutilizable para el bloque de usuario del Topbar. Abre con click, cierra con click fuera,
 * Escape o al repetir el click, y devuelve el foco al disparador. Flechas, Inicio y Fin recorren las opciones.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VitaliaIconComponent],
  selector: 'app-user-menu',
  template: `
    @if (data(); as user) {
      <div class="user-menu">
        <button #trigger class="trigger" type="button" [attr.aria-expanded]="open()" [attr.aria-controls]="panelId" [attr.aria-label]="'Menú de cuenta de ' + user.name" (click)="toggle()">
          <span class="avatar" aria-hidden="true">{{ user.avatarInitial }}</span>
          <strong class="name">{{ user.name }}</strong>
          <app-vitalia-icon class="caret" name="chevron-right" [size]="16" />
        </button>

        @if (open()) {
          <div #panel [id]="panelId" class="panel" role="group" [attr.aria-label]="'Cuenta de ' + user.name" (keydown)="onKeydown($event)">
            <div class="identity">
              <span class="avatar" aria-hidden="true">{{ user.avatarInitial }}</span>
              <div><strong>{{ user.name }}</strong><small>{{ user.email }}</small><small>{{ user.role }}</small></div>
            </div>
            <hr />
            <button type="button" [disabled]="!profilePath()" (click)="go(profilePath())"><app-vitalia-icon name="user" [size]="19" /><span>Mi perfil</span></button>
            <button type="button" [disabled]="!settingsPath()" (click)="go(settingsPath())"><app-vitalia-icon name="menu" [size]="19" /><span>Configuración</span></button>
            <hr />
            <button type="button" class="logout" (click)="onLogout()"><app-vitalia-icon name="logout" [size]="19" /><span>Cerrar sesión</span></button>
          </div>
        }
      </div>
    }
  `,
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly panelId = `user-menu-${++nextId}`;
  protected readonly open = signal(false);

  constructor() {
    effect((onCleanup) => {
      if (!this.open()) return;
      const handleOutsidePointer = (event: PointerEvent): void => {
        if (event.target instanceof Node && !this.host.nativeElement.contains(event.target)) this.close();
      };
      document.addEventListener('pointerdown', handleOutsidePointer, true);
      onCleanup(() => document.removeEventListener('pointerdown', handleOutsidePointer, true));
    });
  }

  protected readonly data = computed<UserMenuData | null>(() => {
    const user = this.auth.currentUser();
    if (!user) return null;
    return { name: user.displayName, email: user.email, role: roleLabel(user.role), avatarInitial: user.displayName.charAt(0).toUpperCase() };
  });

  private readonly accountPaths = computed(() => { const role = this.auth.currentUser()?.role; return role ? ACCOUNT_PATHS[role] ?? null : null; });
  protected readonly profilePath = computed(() => this.accountPaths()?.profile ?? null);
  protected readonly settingsPath = computed(() => this.accountPaths()?.settings ?? null);

  protected toggle(): void { this.open() ? this.close() : this.openMenu(); }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    afterNextRender(() => this.trigger()?.nativeElement.focus(), { injector: this.injector });
  }

  protected go(path: string | null): void {
    if (!path) return;
    this.close();
    void this.router.navigateByUrl(path);
  }

  protected onLogout(): void {
    this.close();
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
    const items = this.focusables();
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const targets: Record<string, number> = { ArrowDown: (current + 1) % items.length, ArrowUp: (current - 1 + items.length) % items.length, Home: 0, End: items.length - 1 };
    const target = targets[event.key];
    if (target !== undefined) { event.preventDefault(); items[target].focus(); return; }
    if (event.key !== 'Tab') return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  private openMenu(): void {
    this.open.set(true);
    afterNextRender(() => this.focusables()[0]?.focus(), { injector: this.injector });
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.panel()?.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
  }
}

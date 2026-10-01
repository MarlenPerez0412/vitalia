import { inject, Injectable, signal } from '@angular/core';
import { Role, User } from '../models/domain.models';
import { AuthBackend, DemoRole } from './auth-backend';

const ROLE_HOME: Partial<Record<Role, string>> = {
  SENIOR: '/senior',
  CAREGIVER: '/care',
  HEALTH: '/health',
  ADMIN: '/admin',
};

/** Estado de sesion de la app. La verificacion de credenciales vive en `AuthBackend` (mock hoy, Supabase despues). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly backend = inject(AuthBackend);
  private readonly storageKey = 'vitalia.mock-user';
  readonly currentUser = signal<User | null>(this.restoreUser());

  async signIn(email: string, password: string): Promise<User> {
    const user = await this.backend.signIn({ email, password });
    this.startSession(user);
    return user;
  }

  /** Modo demostracion: entra con el usuario ficticio del rol, sin credenciales. */
  loginAs(role: DemoRole): User {
    const user = this.backend.demoUser(role);
    this.startSession(user);
    return user;
  }

  logout(): void {
    this.currentUser.set(null);
    try { localStorage.removeItem(this.storageKey); } catch { /* almacenamiento no disponible */ }
    void this.backend.signOut();
  }

  homeFor(role: Role): string {
    return ROLE_HOME[role] ?? '/login';
  }

  /** Destino tras iniciar sesion: `returnUrl` solo si pertenece al area del rol; si no, su inicio. */
  redirectFor(user: User, returnUrl?: string | null): string {
    const home = this.homeFor(user.role);
    return returnUrl && (returnUrl === home || returnUrl.startsWith(`${home}/`)) ? returnUrl : home;
  }

  private startSession(user: User): void {
    this.currentUser.set(user);
    try { localStorage.setItem(this.storageKey, user.id); } catch { /* almacenamiento no disponible */ }
  }

  private restoreUser(): User | null {
    try {
      const storedId = localStorage.getItem(this.storageKey);
      return storedId ? this.backend.restore(storedId) : null;
    } catch {
      return null;
    }
  }
}

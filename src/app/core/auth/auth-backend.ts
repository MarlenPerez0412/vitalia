import { Injectable } from '@angular/core';
import { Role, User } from '../models/domain.models';
import { MOCK_USERS } from '../services/mock-data';

export type DemoRole = Exclude<Role, 'INSTITUTION'>;

export interface AuthCredentials {
  email: string;
  password: string;
}

export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'INACTIVE_USER' | 'UNAVAILABLE';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode, message: string) { super(message); }
}

/** Contrasena comun de las cuentas de demostracion (documentada en docs/ROLES_PERMISSIONS.md). */
export const DEMO_PASSWORD = 'vitalia2026';

/**
 * Punto unico de sustitucion de la autenticacion. Hoy lo implementa `MockAuthBackend`;
 * para Supabase Auth basta con proveer otra implementacion (p. ej. `signInWithPassword`) en `app.config.ts`.
 */
@Injectable({ providedIn: 'root', useFactory: () => new MockAuthBackend() })
export abstract class AuthBackend {
  abstract signIn(credentials: AuthCredentials): Promise<User>;
  /** Acceso sin credenciales para presentar la plataforma (modo demostracion). */
  abstract demoUser(role: DemoRole): User;
  /** Recupera la sesion persistida (id opaco) al recargar. */
  abstract restore(sessionId: string): User | null;
  abstract signOut(): Promise<void>;
}

export class MockAuthBackend extends AuthBackend {
  async signIn({ email, password }: AuthCredentials): Promise<User> {
    const user = MOCK_USERS.find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password !== DEMO_PASSWORD) throw new AuthError('INVALID_CREDENTIALS', 'El correo o la contraseña no son correctos.');
    if (!user.active) throw new AuthError('INACTIVE_USER', 'Esta cuenta está desactivada. Contacta a tu administrador.');
    return user;
  }

  demoUser(role: DemoRole): User {
    const user = MOCK_USERS.find((candidate) => candidate.role === role);
    if (!user) throw new AuthError('UNAVAILABLE', `No existe un usuario de demostración para el rol ${role}.`);
    return user;
  }

  restore(sessionId: string): User | null {
    return MOCK_USERS.find((user) => user.id === sessionId) ?? null;
  }

  async signOut(): Promise<void> { /* sin sesion remota en el mock */ }
}

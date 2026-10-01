import { TestBed } from '@angular/core/testing';
import { AuthError, DEMO_PASSWORD } from './auth-backend';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
  });

  it('signs in with demo credentials and persists only the opaque session id', async () => {
    const user = await auth.signIn('Maria@demo.vitalia.mx', DEMO_PASSWORD);
    expect(user.role).toBe('SENIOR');
    expect(auth.currentUser()?.displayName).toBe('María Hernández');
    expect(localStorage.getItem('vitalia.mock-user')).toBe('usr-senior-demo');
  });

  it('rejects wrong credentials with a friendly error', async () => {
    await expect(auth.signIn('maria@demo.vitalia.mx', 'incorrecta')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.signIn('nadie@demo.vitalia.mx', DEMO_PASSWORD)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(auth.currentUser()).toBeNull();
  });

  it('enters demo mode per role and logs out clearing the session', () => {
    expect(auth.loginAs('CAREGIVER').displayName).toBe('Ana Hernández');
    auth.logout();
    expect(auth.currentUser()).toBeNull();
    expect(localStorage.getItem('vitalia.mock-user')).toBeNull();
  });

  it('only honors a returnUrl inside the role area', () => {
    const admin = auth.loginAs('ADMIN');
    expect(auth.redirectFor(admin, '/admin/users')).toBe('/admin/users');
    expect(auth.redirectFor(admin, '/senior/lia')).toBe('/admin');
    expect(auth.redirectFor(admin, '/administracion-falsa')).toBe('/admin');
    expect(auth.redirectFor(admin, null)).toBe('/admin');
  });
});

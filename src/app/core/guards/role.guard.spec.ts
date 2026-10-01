import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { guestGuard } from './guest.guard';
import { roleGuard } from './role.guard';

describe('roleGuard and guestGuard', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  function canActivate(roles: string[], url: string): boolean | UrlTree {
    const route = { data: { roles } } as unknown as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => roleGuard(route, state)) as boolean | UrlTree;
  }

  it('sends visitors to login keeping the requested URL', () => {
    const result = canActivate(['ADMIN'], '/admin/users');
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fadmin%2Fusers');
  });

  it('blocks another role typing the URL and sends it to its own home', () => {
    auth.loginAs('SENIOR');
    expect(router.serializeUrl(canActivate(['ADMIN'], '/admin') as UrlTree)).toBe('/senior');
    auth.loginAs('CAREGIVER');
    expect(router.serializeUrl(canActivate(['HEALTH'], '/health') as UrlTree)).toBe('/care');
  });

  it('lets each role into its own area', () => {
    for (const [role, area] of [['SENIOR', '/senior'], ['CAREGIVER', '/care'], ['HEALTH', '/health'], ['ADMIN', '/admin']] as const) {
      auth.loginAs(role);
      expect(canActivate([role], area)).toBe(true);
    }
  });

  it('keeps /login for visitors only', () => {
    const run = () => TestBed.runInInjectionContext(() => guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(run()).toBe(true);
    auth.loginAs('HEALTH');
    expect(router.serializeUrl(run() as UrlTree)).toBe('/health');
  });
});

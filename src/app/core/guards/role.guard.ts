import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Role } from '../models/domain.models';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const allowedRoles = (route.data['roles'] ?? []) as Role[];
  return allowedRoles.length === 0 || allowedRoles.includes(user.role)
    ? true
    : router.parseUrl(auth.homeFor(user.role));
};

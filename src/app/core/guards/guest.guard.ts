import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** `/login` solo para visitantes: con sesion activa se redirige al inicio de su rol. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const user = auth.currentUser();
  return user ? inject(Router).parseUrl(auth.homeFor(user.role)) : true;
};

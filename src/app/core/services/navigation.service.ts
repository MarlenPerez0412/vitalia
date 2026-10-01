import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Navegación determinista: cada subpantalla declara su padre y conserva el contexto de persona/paciente. */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  goTo(parentRoute: string, context: Record<string, string | number | null | undefined> = {}): Promise<boolean> {
    const inherited = this.route.snapshot.queryParamMap.get('seniorId') ?? this.route.snapshot.queryParamMap.get('patientId');
    const queryParams = { ...(inherited ? { seniorId: inherited } : {}), ...context };
    if (!Object.values(queryParams).some((value) => value !== null && value !== undefined)) return this.router.navigateByUrl(parentRoute);
    return this.router.navigate([parentRoute], { queryParams });
  }
}

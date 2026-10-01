import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PREVENT_FACTORS } from '../../../../core/services/senior-mock-data';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { AlertCardComponent } from '../../../../shared/ui/cards/alert-card.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertCardComponent, AppButtonComponent, SeniorPageComponent, VitaliaIconComponent],
  selector: 'app-prevent-page',
  template: `
    <app-senior-page eyebrow="Prevención respetuosa" title="VITALIA Prevent" description="Observa cambios frente a tu propia rutina y te permite decidir qué hacer." backPath="/senior/health">
      @if (resolved()) {
        <div class="senior-page__notice" role="status"><app-vitalia-icon name="check" /><p><strong>Gracias por confirmar que estás bien.</strong><span>El registro quedó guardado en esta demostración.</span></p></div>
      } @else {
        <div class="senior-page__notice senior-page__notice--warning"><app-vitalia-icon name="alert" /><p><strong>Se detectó un cambio respecto a tu rutina habitual.</strong><span>Esto no significa una emergencia ni un diagnóstico.</span></p></div>
        <div class="senior-page__grid">@for (factor of factors; track factor.label) { <app-alert-card [title]="factor.label + ' ' + factor.value" [description]="factor.detail" timestamp="Últimos 7 días" [severity]="factor.severity" /> }</div>
        <div class="senior-page__actions"><app-button icon="check" (pressed)="resolved.set(true)">Estoy bien</app-button><app-button variant="secondary" icon="phone" (pressed)="go('/senior/family')">Contactar familiar</app-button><app-button variant="ghost" (pressed)="go('/senior/medications/history')">Revisar</app-button></div>
      }
    </app-senior-page>
  `,
})
export class PreventPageComponent {
  protected readonly factors = PREVENT_FACTORS;
  protected readonly resolved = signal(false);
  private readonly router = inject(Router);
  protected go(path: string): void { void this.router.navigateByUrl(path); }
}

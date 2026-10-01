import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationEventsService } from '../../../../core/services/notification-events.service';
import { DEMO_SENIOR_ID } from '../../../../core/services/mock-database.service';
import { SharedCalendarService } from '../../../../core/services/shared-calendar.service';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { AlertCardComponent } from '../../../../shared/ui/cards/alert-card.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';
import { SeniorPageComponent } from '../../components/senior-page/senior-page.component';
import { VitaliaInsightsService } from '../../services/vitalia-insights.service';

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
        <div class="senior-page__grid">@for (factor of factors(); track factor.label) { <app-alert-card [title]="factor.label + ' ' + factor.value" [description]="factor.detail" timestamp="Últimos 7 días" [severity]="factor.severity" /> }</div>
        <div class="senior-page__panel"><h2>Sugerencia</h2><p>Detectamos menor movimiento esta semana. ¿Te gustaría programar una caminata suave de 10 minutos?</p><app-button icon="check" (pressed)="acceptSuggestion()">Aceptar sugerencia</app-button></div>
        <div class="senior-page__actions"><app-button icon="check" (pressed)="resolved.set(true)">Estoy bien</app-button><app-button variant="secondary" icon="phone" (pressed)="go('/senior/family')">Contactar familiar</app-button><app-button variant="ghost" (pressed)="go('/senior/medications/history')">Revisar medicamentos</app-button><app-button variant="ghost" (pressed)="go('/senior/wellbeing/checkin')">Registrar bienestar</app-button></div>
      }
    </app-senior-page>
  `,
})
export class PreventPageComponent {
  protected readonly factors = inject(VitaliaInsightsService).preventFactors;
  protected readonly resolved = signal(false);
  private readonly router = inject(Router);
  private readonly calendar = inject(SharedCalendarService);

  constructor() {
    // Prevent muestra un cambio frente a la rutina: se avisa una sola vez por el mismo hecho.
    inject(NotificationEventsService).preventChangeDetected();
  }
  protected acceptSuggestion(): void {
    const date = new Date(); date.setDate(date.getDate() + 1); const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    this.calendar.create({ ownerUserId: DEMO_SENIOR_ID, title: 'Caminata suave de 10 minutos', category: 'HABIT', sourceModule: 'PREVENT', sourceEntityId: 'prevent-activity-suggestion', date: localDate, startTime: '17:00', endTime: '17:10', allDay: false, reminder: '15 minutos antes', status: 'SCHEDULED' });
    this.resolved.set(true);
  }
  protected go(path: string): void { void this.router.navigateByUrl(path); }
}

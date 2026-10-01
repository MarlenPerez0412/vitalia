import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';
import { VitaliaIconComponent } from '../../../../shared/ui/icon/vitalia-icon.component';

type PensionDetailView = 'pension' | 'imss' | 'issste' | 'sat' | 'deposits';
type PensionFilter = 'PENSION' | 'IMSS' | 'ISSSTE' | 'SAT' | 'DEPOSIT';

interface AgendaItem { readonly title: string; readonly date: string; readonly icon: 'wallet' | 'heart' | 'clipboard' | 'chart'; }
interface DepositMovement { readonly date: string; readonly period: string; readonly status: string; readonly amount: string; }

const VIEW_INFO: Readonly<Record<PensionDetailView, { title: string; subtitle: string; filter: PensionFilter }>> = {
  pension: { title: 'Pensión Bienestar', subtitle: 'Consulta periodos estimados, depósitos y recordatorios.', filter: 'PENSION' },
  imss: { title: 'IMSS', subtitle: 'Organiza citas, estudios, vigencia y trámites médicos.', filter: 'IMSS' },
  issste: { title: 'ISSSTE', subtitle: 'Consulta servicios, trámites y seguimiento.', filter: 'ISSSTE' },
  sat: { title: 'SAT', subtitle: 'Organiza citas, declaraciones y recordatorios fiscales.', filter: 'SAT' },
  deposits: { title: 'Historial de depósitos', subtitle: 'Movimientos simulados registrados.', filter: 'DEPOSIT' },
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent, NgTemplateOutlet, VitaliaIconComponent],
  selector: 'app-pensions-detail-page',
  template: `
    <section class="detail-page" aria-labelledby="detail-title">
      <button type="button" class="back-link" (click)="back()">← Volver a Pensiones y trámites</button>
      <header class="detail-header"><p class="eyebrow">Información simulada</p><h1 id="detail-title">{{ info.title }}</h1><p>{{ info.subtitle }}</p></header>

      @if (view === 'pension') {
        <div class="content-grid">
          <section class="highlight"><span>Próximo periodo estimado</span><strong>Noviembre - diciembre</strong><small>Información simulada</small></section>
          <article class="info-card"><h2>Próximo depósito</h2><strong>4 de noviembre de 2026</strong><p>Depósito estimado en tu tarjeta Bienestar.</p><app-button variant="secondary" (pressed)="notice.set('Recordatorio simulado agregado.')">Agregar recordatorio</app-button></article>
          <article class="info-card"><h2>Historial reciente</h2><p>Últimos movimientos simulados.</p><app-button variant="ghost" (pressed)="go('/senior/pensions/deposits')">Ver historial</app-button></article>
          <article class="info-card"><h2>Documentos y requisitos</h2><ul><li>Identificación oficial vigente</li><li>CURP actualizada</li><li>Comprobante de domicilio</li></ul></article>
        </div>
        <ng-container *ngTemplateOutlet="agendaTemplate; context: { title: 'Agenda de pensión', items: pensionAgenda }" />
      } @else if (view === 'imss') {
        <div class="action-row"><app-button (pressed)="notice.set('Cita simulada agregada.')">Agregar cita</app-button><app-button variant="secondary" (pressed)="notice.set('Trámite simulado agregado.')">Agregar trámite</app-button></div>
        <div class="content-grid"><article class="info-card"><h2>Próxima cita</h2><strong>13 de octubre de 2026 · 10:00 a.m.</strong><p>Clínica IMSS Tehuacán</p><span class="status status--ok">Confirmada</span><app-button variant="ghost" (pressed)="notice.set('Detalle simulado de la cita.')">Ver detalle</app-button></article><article class="info-card"><h2>Estudios o resultados</h2><strong>Entrega de resultados</strong><p>16 de octubre de 2026</p><span class="status">Pendiente</span></article><article class="info-card"><h2>Trámites IMSS</h2><ul><li>Vigencia de derechos</li><li>Afiliación</li><li>Cambio de clínica</li></ul></article></div>
        <ng-container *ngTemplateOutlet="agendaTemplate; context: { title: 'Agenda IMSS', items: imssAgenda }" />
      } @else if (view === 'issste') {
        <div class="action-row"><app-button (pressed)="notice.set('Documento simulado agregado.')">Agregar documento</app-button><app-button variant="secondary" (pressed)="notice.set('Trámite simulado agregado.')">Agregar trámite</app-button></div>
        <div class="content-grid"><section class="highlight"><span>Trámite en seguimiento</span><strong>Credencial ISSSTE</strong><small>Pendiente · 2 de 4 pasos</small><div class="progress"><span></span></div></section><article class="info-card"><h2>Servicios frecuentes</h2><ul><li>Orientación</li><li>Requisitos</li><li>Consulta de pensión</li></ul></article><article class="info-card"><h2>Documentos sugeridos</h2><ul><li>Identificación oficial vigente</li><li>CURP</li><li>Comprobante de domicilio</li></ul></article></div>
        <ng-container *ngTemplateOutlet="agendaTemplate; context: { title: 'Agenda ISSSTE', items: isssteAgenda }" />
      } @else if (view === 'sat') {
        <div class="action-row"><app-button (pressed)="notice.set('Cita simulada agregada.')">Agregar cita</app-button><app-button variant="secondary" (pressed)="notice.set('Recordatorio fiscal simulado agregado.')">Agregar recordatorio fiscal</app-button></div>
        <div class="content-grid"><article class="info-card"><h2>Próximo recordatorio fiscal</h2><strong>Declaración anual SAT</strong><p>21 de octubre de 2026</p><span class="status">Pendiente</span></article><article class="info-card"><h2>Citas SAT</h2><strong>24 de octubre de 2026 · 9:30 a.m.</strong><p>En línea</p></article><article class="info-card"><h2>Documentos sugeridos</h2><ul><li>RFC</li><li>Contraseña</li><li>Constancia fiscal</li></ul></article></div>
        <ng-container *ngTemplateOutlet="agendaTemplate; context: { title: 'Agenda SAT', items: satAgenda }" />
      } @else {
        <div class="content-grid"><section class="highlight"><span>Último depósito</span><strong>4 de noviembre de 2026 · +$6,000</strong><small>Simulado</small></section><article class="info-card"><h2>Resumen del periodo</h2><strong>$24,000</strong><p>Total simulado acumulado.</p><small>Próximo periodo: noviembre - diciembre 2026</small></article></div>
        <div class="periods" role="group" aria-label="Filtrar por bimestre">@for (period of periods; track period) { <button type="button" [class.period--active]="selectedPeriod() === period" (click)="selectedPeriod.set(period)">{{ period }}</button> }</div>
        <section class="movements"><h2>Movimientos registrados</h2><div class="movement-head"><span>Fecha</span><span>Periodo</span><span>Estado</span><span>Monto</span></div>@for (movement of filteredMovements(); track movement.date) { <div class="movement"><span>{{ movement.date }}</span><span>{{ movement.period }}</span><span>{{ movement.status }}</span><strong>{{ movement.amount }}</strong></div> } @empty { <p class="empty">No hay movimientos para este bimestre.</p> }</section>
        <div class="action-row"><app-button (pressed)="notice.set('Movimiento simulado agregado.')">Agregar movimiento simulado</app-button><app-button variant="secondary" (pressed)="openCalendar()">Ver eventos relacionados en calendario</app-button></div>
      }

      @if (notice()) { <p class="notice" role="status">{{ notice() }}</p> }
      <button type="button" class="calendar-link" (click)="openCalendar()">Ver en calendario general <app-vitalia-icon name="chevron-right" [size]="19" /></button>
    </section>

    <ng-template #agendaTemplate let-title="title" let-items="items">
      <section class="agenda"><h2>{{ title }}</h2>@for (item of items; track item.title) { <div class="agenda-item"><span class="agenda-icon"><app-vitalia-icon [name]="item.icon" [size]="19" /></span><span><strong>{{ item.title }}</strong><small>{{ item.date }}</small></span></div> }</section>
    </ng-template>
  `,
  styleUrl: './pensions-detail-page.component.scss',
})
export class PensionsDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly view = this.route.snapshot.data['pensionView'] as PensionDetailView;
  protected readonly info = VIEW_INFO[this.view];
  protected readonly notice = signal('');
  protected readonly selectedPeriod = signal('Nov-Dic');
  protected readonly periods = ['Ene-Feb', 'Mar-Abr', 'May-Jun', 'Jul-Ago', 'Sep-Oct', 'Nov-Dic'];
  protected readonly pensionAgenda: readonly AgendaItem[] = [{ title: 'Depósito Pensión Bienestar', date: '4 nov 2026', icon: 'wallet' }, { title: 'Aviso de siguiente periodo', date: '1 nov 2026', icon: 'clipboard' }, { title: 'Entrega de tarjetas', date: '18 nov 2026', icon: 'wallet' }];
  protected readonly imssAgenda: readonly AgendaItem[] = [{ title: 'Cita IMSS', date: '13 oct 2026', icon: 'heart' }, { title: 'Entrega de resultados', date: '16 oct 2026', icon: 'clipboard' }, { title: 'Revisión IMSS', date: '22 oct 2026', icon: 'heart' }];
  protected readonly isssteAgenda: readonly AgendaItem[] = [{ title: 'Revisión de pensión', date: '15 oct 2026', icon: 'wallet' }, { title: 'Entrega de documentos', date: '20 oct 2026', icon: 'clipboard' }, { title: 'Cita de orientación', date: '27 oct 2026', icon: 'heart' }];
  protected readonly satAgenda: readonly AgendaItem[] = [{ title: 'Declaración anual', date: '21 oct 2026', icon: 'clipboard' }, { title: 'Cita SAT', date: '24 oct 2026', icon: 'clipboard' }, { title: 'Aviso fiscal', date: '30 oct 2026', icon: 'clipboard' }];
  protected readonly movements: readonly DepositMovement[] = [{ date: '4 nov 2026', period: 'Nov-Dic', status: 'Depositado', amount: '+$6,000' }, { date: '5 sep 2026', period: 'Sep-Oct', status: 'Depositado', amount: '+$6,000' }, { date: '4 jul 2026', period: 'Jul-Ago', status: 'Depositado', amount: '+$6,000' }, { date: '5 may 2026', period: 'May-Jun', status: 'Depositado', amount: '+$6,000' }];
  protected readonly filteredMovements = computed(() => this.movements.filter((movement) => movement.period === this.selectedPeriod()));

  protected back(): void { void this.router.navigateByUrl('/senior/pensions'); }
  protected go(route: string): void { void this.router.navigateByUrl(route); }
  protected openCalendar(): void { void this.router.navigate(['/senior/pensions/calendar'], { queryParams: { filter: this.info.filter } }); }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarEventCategory, CalendarEventRecord } from '../../../../core/models/mock-database.models';
import { DEMO_SENIOR_ID } from '../../../../core/services/mock-database.service';
import { CalendarConflictResult, SharedCalendarService } from '../../../../core/services/shared-calendar.service';
import { AppButtonComponent } from '../../../../shared/ui/button/app-button.component';

interface CategoryMeta {
  key: CalendarEventCategory;
  label: string;
  color: string;
  bg: string;
  icon: string;
}

const CATEGORY_META: CategoryMeta[] = [
  { key: 'PENSION',  label: 'Pensión Bienestar',        color: '#d97706', bg: '#fef3c7', icon: '🤍' },
  { key: 'IMSS',     label: 'IMSS',                     color: '#0d9488', bg: '#ccfbf1', icon: '🛡️' },
  { key: 'ISSSTE',   label: 'ISSSTE',                   color: '#2563eb', bg: '#dbeafe', icon: '🛡️' },
  { key: 'SAT',      label: 'SAT',                      color: '#16a34a', bg: '#dcfce7', icon: '👤' },
  { key: 'SERVICES', label: 'Servicios (luz, agua, etc.)', color: '#dc2626', bg: '#fee2e2', icon: '🏠' },
  { key: 'HEALTH',   label: 'Citas médicas',            color: '#e11d48', bg: '#ffe4e6', icon: '⚕️' },
  { key: 'TRAMITE',  label: 'Trámites',                 color: '#ea580c', bg: '#ffedd5', icon: '📄' },
  { key: 'DEPOSIT',  label: 'Depósitos',                color: '#0891b2', bg: '#cffafe', icon: '💰' },
  { key: 'PERSONAL', label: 'Personal',                 color: '#7c3aed', bg: '#ede9fe', icon: '📅' },
  { key: 'OTHER',    label: 'Otros',                    color: '#6b7280', bg: '#f3f4f6', icon: '📦' },
];

const META_MAP = new Map<CalendarEventCategory, CategoryMeta>(CATEGORY_META.map((m) => [m.key, m]));

function getMeta(cat: CalendarEventCategory): CategoryMeta {
  return META_MAP.get(cat) ?? { key: cat, label: cat, color: '#6b7280', bg: '#f3f4f6', icon: '📌' };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-calendar-page',
  imports: [AppButtonComponent, ReactiveFormsModule],
  template: `
    <div class="cal-root">

      <!-- Top bar -->
      <header class="cal-topbar">
        <button type="button" class="back-btn" (click)="goBack()">← Volver a Pensiones y trámites</button>
        <div>
          <h1 class="cal-main-title">Calendario de mis eventos</h1>
          <p class="cal-subtitle">Todos tus recordatorios y fechas importantes en un solo lugar.</p>
        </div>
        <app-button (pressed)="startCreate()">+ Agregar evento</app-button>
      </header>

      <div class="cal-body">

        <!-- Left: category sidebar -->
        <aside class="cal-sidebar">
          <div class="sidebar-header">
            <span class="sidebar-title">Categorías</span>
            <label class="toggle-label">
              Mostrar todas
              <input type="checkbox" class="toggle-input" [checked]="showAll()" (change)="toggleAll()" />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
          @for (meta of categoryMeta; track meta.key) {
            <label class="cat-row" [style.--cat-color]="meta.color" [style.--cat-bg]="meta.bg">
              <input type="checkbox" [checked]="activeCategories().has(meta.key)" (change)="toggleCategory(meta.key)" />
              <span class="cat-icon" [style.background]="meta.bg" [style.color]="meta.color">{{ meta.icon }}</span>
              <span class="cat-label">{{ meta.label }}</span>
            </label>
          }
          @if (isPensionCalendar) {
            <p class="notice-demo">Referencias de demostración, sin conexión con instituciones.</p>
          }
        </aside>

        <!-- Center: calendar grid -->
        <main class="cal-center">
          <div class="cal-nav">
            <button type="button" class="nav-arrow" (click)="previousMonth()">&#8249;</button>
            <h2 class="month-label">{{ monthLabel() }}</h2>
            <button type="button" class="nav-arrow" (click)="nextMonth()">&#8250;</button>
            <div class="view-tabs">
              <button type="button" class="view-tab view-tab--active">Mes</button>
              <button type="button" class="view-tab">Semana</button>
              <button type="button" class="view-tab">Día</button>
            </div>
            <button type="button" class="today-btn" (click)="today()">Hoy</button>
            <button type="button" class="nav-arrow" (click)="nextMonth()">&#8250;</button>
          </div>
          <div class="weekdays">
            @for (d of weekdays; track d) { <span>{{ d }}</span> }
          </div>
          <div class="month-grid">
            @for (cell of monthDays(); track cell.key) {
              @if (cell.date) {
                <div class="day-cell" [class.day-cell--today]="cell.key === todayKey" [class.day-cell--selected]="cell.key === selectedDate()" (click)="select(cell.key)">
                  <span class="day-num">{{ cell.date }}</span>
                  <div class="day-events">
                    @for (ev of eventsForDay(cell.key); track ev.id) {
                      <button type="button" class="ev-pill" [style.background]="catMeta(ev.category).bg" [style.color]="catMeta(ev.category).color" (click)="selectEvent(ev, $event)">
                        {{ ev.title }}
                      </button>
                    }
                  </div>
                </div>
              } @else {
                <div class="day-cell day-cell--empty"></div>
              }
            }
          </div>
        </main>

        <!-- Right: upcoming + detail -->
        <aside class="cal-right">
          @if (selectedEvent()) {
            <section class="detail-panel">
              <div class="detail-header">
                <span class="detail-icon" [style.background]="catMeta(selectedEvent()!.category).bg" [style.color]="catMeta(selectedEvent()!.category).color">{{ catMeta(selectedEvent()!.category).icon }}</span>
                <div>
                  <h3 class="detail-title">{{ selectedEvent()!.title }}</h3>
                  <span class="detail-badge" [style.background]="catMeta(selectedEvent()!.category).bg" [style.color]="catMeta(selectedEvent()!.category).color">{{ catMeta(selectedEvent()!.category).label }}</span>
                </div>
                <button type="button" class="close-btn" (click)="selectedEvent.set(null)">✕</button>
              </div>
              <ul class="detail-meta">
                @if (selectedEvent()!.date) { <li>📅 {{ formatDate(selectedEvent()!.date) }}</li> }
                @if (selectedEvent()!.startTime) { <li>🕙 {{ selectedEvent()!.startTime }}</li> }
                @if (selectedEvent()!.institution) { <li>📍 {{ selectedEvent()!.institution }}</li> }
              </ul>
              <div class="detail-actions">
                <app-button variant="ghost" (pressed)="startEdit(selectedEvent()!)">✏️ Editar</app-button>
                @if (selectedEvent()!.sourceModule === 'MANUAL') {
                  <app-button variant="ghost" (pressed)="remove(selectedEvent()!.id); selectedEvent.set(null)">🗑️ Eliminar</app-button>
                }
              </div>
              @if (selectedEvent()!.status !== 'CANCELLED' && selectedEvent()!.status !== 'COMPLETED') {
                <app-button (pressed)="markCompleted(selectedEvent()!.id)">✔ Marcar como completado</app-button>
              }
            </section>
          }

          <section class="upcoming-panel">
            <div class="upcoming-header"><span>Próximos eventos</span><button type="button" class="link-btn">Ver todos</button></div>
            @for (ev of upcomingEvents(); track ev.id) {
              <button type="button" class="upcoming-row" (click)="selectEvent(ev)">
                <span class="upcoming-icon" [style.background]="catMeta(ev.category).bg" [style.color]="catMeta(ev.category).color">{{ catMeta(ev.category).icon }}</span>
                <div>
                  <p class="upcoming-title">{{ ev.title }}</p>
                  <p class="upcoming-date">{{ formatDate(ev.date) }}</p>
                </div>
              </button>
            } @empty {
              <p class="upcoming-empty">No hay próximos eventos.</p>
            }
          </section>

          <a class="emergency-btn" href="#/senior/emergency">
            <span class="emergency-plus">+</span>
            <div><strong>Necesito ayuda</strong><span>Contactar a mi red de apoyo</span></div>
          </a>
        </aside>

      </div>

      <!-- Event form overlay -->
      @if (editing()) {
        <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="form-title">
          <form class="event-form" [formGroup]="form" (ngSubmit)="save()">
            <h2 id="form-title">{{ editing() === 'new' ? 'Nuevo evento' : 'Editar evento' }}</h2>
            <div class="v-form-grid">
              <div class="v-field"><label for="ev-title">Título</label><input id="ev-title" class="v-input" formControlName="title" /></div>
              <div class="v-field"><label for="ev-cat">Categoría</label>
                <select id="ev-cat" class="v-input" formControlName="category">
                  @for (m of categoryMeta; track m.key) { <option [value]="m.key">{{ m.label }}</option> }
                </select>
              </div>
              <div class="v-field"><label for="ev-date">Fecha</label><input id="ev-date" class="v-input" type="date" formControlName="date" /></div>
              <div class="v-field"><label for="ev-start">Inicio</label><input id="ev-start" class="v-input" type="time" formControlName="startTime" /></div>
              <div class="v-field"><label for="ev-end">Fin</label><input id="ev-end" class="v-input" type="time" formControlName="endTime" /></div>
              <div class="v-field"><label for="ev-inst">Institución / Lugar</label><input id="ev-inst" class="v-input" formControlName="institution" /></div>
              <div class="v-field"><label for="ev-rem">Recordatorio</label><input id="ev-rem" class="v-input" formControlName="reminder" /></div>
              <label class="check"><input type="checkbox" formControlName="allDay" /> Todo el día</label>
            </div>
            @if (conflict(); as r) {
              <p class="conflict-msg">Horario se cruza con «{{ r.conflicts[0].title }}».</p>
            }
            <div class="form-actions">
              <app-button type="submit" icon="check">Guardar</app-button>
              <app-button variant="ghost" (pressed)="editing.set(null)">Cancelar</app-button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }

    .cal-root { display: flex; flex-direction: column; min-height: 100dvh; background: #f0faf8; font-family: inherit; }

    /* Top bar */
    .cal-topbar { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; background: white; border-bottom: 1px solid #d1fae5; flex-wrap: wrap; }
    .cal-topbar > div { flex: 1; }
    .back-btn { background: white; border: 1.5px solid #d1d5db; border-radius: 2rem; color: #374151; cursor: pointer; font-size: .9rem; font-weight: 600; padding: .45rem 1rem; white-space: nowrap; }
    .back-btn:hover { background: #f3f4f6; }
    .cal-main-title { font-size: 1.6rem; font-weight: 800; margin: 0; color: #111827; }
    .cal-subtitle { color: #6b7280; font-size: .9rem; margin: .2rem 0 0; }

    /* Body */
    .cal-body { display: grid; grid-template-columns: 240px 1fr 280px; gap: 0; flex: 1; }

    /* Sidebar */
    .cal-sidebar { background: white; border-right: 1px solid #e5e7eb; padding: 1rem; display: flex; flex-direction: column; gap: .4rem; overflow-y: auto; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; flex-wrap: wrap; gap: .5rem; }
    .sidebar-title { font-weight: 800; font-size: .95rem; color: #111827; }
    .toggle-label { display: flex; align-items: center; gap: .4rem; font-size: .8rem; color: #374151; cursor: pointer; }
    .toggle-input { display: none; }
    .toggle-track { position: relative; display: inline-block; width: 2.2rem; height: 1.2rem; background: #d1d5db; border-radius: 1rem; transition: background .2s; }
    .toggle-input:checked + .toggle-track { background: #0d9488; }
    .toggle-thumb { position: absolute; top: .15rem; left: .15rem; width: .9rem; height: .9rem; background: white; border-radius: 50%; transition: left .2s; }
    .toggle-input:checked + .toggle-track .toggle-thumb { left: 1.15rem; }
    .cat-row { display: flex; align-items: center; gap: .5rem; cursor: pointer; padding: .35rem .4rem; border-radius: .5rem; transition: background .15s; }
    .cat-row:hover { background: #f9fafb; }
    .cat-row input[type=checkbox] { accent-color: var(--cat-color); width: 1.1rem; height: 1.1rem; cursor: pointer; }
    .cat-icon { font-size: 1rem; width: 1.8rem; height: 1.8rem; border-radius: .4rem; display: grid; place-items: center; flex-shrink: 0; }
    .cat-label { font-size: .82rem; color: #374151; line-height: 1.2; }
    .notice-demo { color: #9ca3af; font-size: .73rem; margin-top: .5rem; text-align: center; }

    /* Center calendar */
    .cal-center { padding: 1rem; overflow: auto; }
    .cal-nav { display: flex; align-items: center; gap: .5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .month-label { font-size: 1.3rem; font-weight: 800; margin: 0 .5rem; min-width: 9rem; text-align: center; }
    .nav-arrow { background: none; border: 1.5px solid #d1d5db; border-radius: 50%; color: #374151; cursor: pointer; font-size: 1.3rem; height: 2rem; line-height: 1; width: 2rem; }
    .nav-arrow:hover { background: #f3f4f6; }
    .view-tabs { display: flex; gap: 0; border: 1.5px solid #d1d5db; border-radius: .5rem; overflow: hidden; margin-left: auto; }
    .view-tab { background: white; border: none; color: #6b7280; cursor: pointer; font-size: .85rem; font-weight: 600; padding: .35rem .8rem; }
    .view-tab--active { background: #0d9488; color: white; }
    .today-btn { background: white; border: 1.5px solid #d1d5db; border-radius: .5rem; color: #374151; cursor: pointer; font-size: .85rem; font-weight: 600; padding: .35rem .8rem; }
    .today-btn:hover { background: #f3f4f6; }
    .weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: .25rem; }
    .weekdays span { color: #6b7280; font-size: .8rem; font-weight: 700; text-align: center; padding: .3rem 0; }
    .month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e5e7eb; border: 1px solid #e5e7eb; border-radius: .75rem; overflow: hidden; }
    .day-cell { background: white; min-height: 6rem; padding: .4rem; cursor: pointer; transition: background .15s; display: flex; flex-direction: column; gap: .2rem; }
    .day-cell:hover { background: #f0fdf4; }
    .day-cell--empty { background: #fafafa; cursor: default; }
    .day-cell--selected { background: #f0fdf4; }
    .day-num { font-size: .85rem; font-weight: 600; color: #374151; width: 1.6rem; height: 1.6rem; display: grid; place-items: center; border-radius: 50%; }
    .day-cell--today .day-num { background: #0d9488; color: white; }
    .day-events { display: flex; flex-direction: column; gap: .15rem; overflow: hidden; }
    .ev-pill { border: none; border-radius: .35rem; cursor: pointer; font-size: .72rem; font-weight: 600; padding: .15rem .4rem; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .ev-pill:hover { filter: brightness(.92); }

    /* Right panel */
    .cal-right { background: white; border-left: 1px solid #e5e7eb; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; }
    .detail-panel { border: 1.5px solid #e5e7eb; border-radius: .75rem; padding: 1rem; display: flex; flex-direction: column; gap: .75rem; }
    .detail-header { display: flex; align-items: flex-start; gap: .6rem; }
    .detail-icon { font-size: 1.1rem; width: 2.2rem; height: 2.2rem; border-radius: .5rem; display: grid; place-items: center; flex-shrink: 0; }
    .detail-title { font-size: 1rem; font-weight: 700; margin: 0 0 .2rem; }
    .detail-badge { font-size: .72rem; font-weight: 700; padding: .15rem .5rem; border-radius: 1rem; }
    .close-btn { background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 1rem; margin-left: auto; }
    .detail-meta { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .35rem; font-size: .85rem; color: #4b5563; }
    .detail-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
    .upcoming-panel { display: flex; flex-direction: column; gap: .5rem; }
    .upcoming-header { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: .9rem; color: #111827; }
    .link-btn { background: none; border: none; color: #0d9488; cursor: pointer; font-size: .82rem; font-weight: 600; }
    .upcoming-row { background: none; border: none; border-radius: .5rem; cursor: pointer; display: flex; align-items: center; gap: .6rem; padding: .5rem .4rem; text-align: left; width: 100%; }
    .upcoming-row:hover { background: #f9fafb; }
    .upcoming-icon { font-size: 1rem; width: 2rem; height: 2rem; border-radius: .5rem; display: grid; place-items: center; flex-shrink: 0; }
    .upcoming-title { font-size: .85rem; font-weight: 600; color: #111827; margin: 0; }
    .upcoming-date { font-size: .77rem; color: #6b7280; margin: .1rem 0 0; }
    .upcoming-empty { color: #9ca3af; font-size: .85rem; text-align: center; }
    .emergency-btn { display: flex; align-items: center; gap: .75rem; background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: .75rem; color: #dc2626; cursor: pointer; padding: .85rem 1rem; text-decoration: none; margin-top: auto; }
    .emergency-plus { background: #dc2626; border-radius: 50%; color: white; font-size: 1.2rem; font-weight: 700; height: 2rem; line-height: 2rem; text-align: center; width: 2rem; flex-shrink: 0; }
    .emergency-btn strong { display: block; font-size: .9rem; }
    .emergency-btn span { font-size: .78rem; }

    /* Form overlay */
    .overlay { align-items: center; background: rgba(0,0,0,.4); display: flex; inset: 0; justify-content: center; position: fixed; z-index: 100; padding: 1rem; }
    .event-form { background: white; border-radius: 1rem; display: flex; flex-direction: column; gap: 1rem; max-height: 90dvh; max-width: 36rem; overflow-y: auto; padding: 1.5rem; width: 100%; }
    .event-form h2 { font-size: 1.2rem; font-weight: 800; margin: 0; }
    .v-form-grid { display: grid; gap: .75rem; grid-template-columns: 1fr 1fr; }
    .v-field { display: flex; flex-direction: column; gap: .3rem; }
    .v-field label { font-size: .82rem; font-weight: 600; color: #374151; }
    .v-input { border: 1.5px solid #d1d5db; border-radius: .5rem; font-size: .9rem; padding: .45rem .6rem; width: 100%; }
    .v-input:focus { border-color: #0d9488; outline: none; }
    .check { align-items: center; display: flex; gap: .5rem; font-size: .85rem; }
    .conflict-msg { background: #fef3c7; border: 1px solid #fcd34d; border-radius: .5rem; color: #92400e; font-size: .85rem; padding: .5rem .75rem; }
    .form-actions { display: flex; gap: .75rem; }

    /* Responsive */
    @media (max-width: 900px) {
      .cal-body { grid-template-columns: 1fr; }
      .cal-sidebar { flex-direction: row; flex-wrap: wrap; border-right: none; border-bottom: 1px solid #e5e7eb; padding: .75rem 1rem; }
      .cal-right { border-left: none; border-top: 1px solid #e5e7eb; }
      .v-form-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .cal-topbar { gap: .5rem; }
      .cal-main-title { font-size: 1.2rem; }
      .day-cell { min-height: 4rem; }
      .ev-pill { font-size: .65rem; }
    }
  `,
})
export class CalendarPageComponent {
  private readonly calendar = inject(SharedCalendarService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly categoryMeta = CATEGORY_META;
  protected readonly isPensionCalendar = this.router.url.startsWith('/senior/pensions');

  protected readonly activeCategories = signal<Set<CalendarEventCategory>>(
    this.resolveInitialCategories(),
  );
  protected readonly showAll = computed(() => this.activeCategories().size === CATEGORY_META.length);

  protected readonly selectedEvent = signal<CalendarEventRecord | null>(null);
  protected readonly editing = signal<string | null>(null);
  protected readonly conflict = signal<CalendarConflictResult | null>(null);

  protected readonly todayKey = this.localDate(new Date());
  protected readonly selectedDate = signal(this.todayKey);
  protected readonly cursor = signal(new Date(`${this.todayKey}T12:00:00`));
  protected readonly weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    category: [this.resolveDefaultCategory() as CalendarEventCategory],
    date: [this.todayKey, Validators.required],
    startTime: ['10:00'],
    endTime: ['11:00'],
    institution: [''],
    reminder: ['1 hora antes'],
    allDay: [false],
  });

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(this.cursor()),
  );

  protected readonly monthDays = computed(() => {
    const current = this.cursor();
    const year = current.getFullYear();
    const month = current.getMonth();
    const first = new Date(year, month, 1);
    const blanks = first.getDay(); // 0=Dom
    const days = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: blanks }, (_, i) => ({ key: `blank-${i}`, date: 0 })),
      ...Array.from({ length: days }, (_, i) => {
        const date = new Date(year, month, i + 1);
        return { key: this.localDate(date), date: i + 1 };
      }),
    ];
  });

  private readonly allOwnerEvents = computed(() => this.calendar.forOwner(DEMO_SENIOR_ID));

  protected readonly upcomingEvents = computed(() => {
    const cats = this.activeCategories();
    return this.allOwnerEvents()
      .filter((e) => e.date >= this.todayKey && e.status !== 'CANCELLED' && cats.has(e.category))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  });

  protected eventsForDay(date: string): CalendarEventRecord[] {
    const cats = this.activeCategories();
    return this.allOwnerEvents().filter((e) => e.date === date && e.status !== 'CANCELLED' && cats.has(e.category));
  }

  protected catMeta(cat: CalendarEventCategory): CategoryMeta { return getMeta(cat); }

  protected toggleAll(): void {
    if (this.showAll()) {
      this.activeCategories.set(new Set());
    } else {
      this.activeCategories.set(new Set(CATEGORY_META.map((m) => m.key)));
    }
  }

  protected toggleCategory(cat: CalendarEventCategory): void {
    this.activeCategories.update((set) => {
      const next = new Set(set);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  protected selectEvent(ev: CalendarEventRecord, e?: Event): void {
    e?.stopPropagation();
    this.selectedEvent.set(ev);
  }

  protected select(date: string): void { this.selectedDate.set(date); this.selectedEvent.set(null); }
  protected previousMonth(): void { this.cursor.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  protected nextMonth(): void { this.cursor.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
  protected today(): void { this.cursor.set(new Date(`${this.todayKey}T12:00:00`)); this.selectedDate.set(this.todayKey); }

  protected goBack(): void {
    void this.router.navigateByUrl(this.isPensionCalendar ? '/senior/pensions' : '/senior');
  }

  protected formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
  }

  protected markCompleted(id: string): void {
    const ev = this.allOwnerEvents().find((e) => e.id === id);
    if (!ev) return;
    const { id: _id, ...rest } = ev;
    this.calendar.update(id, { ...rest, status: 'COMPLETED' }, true);
    this.selectedEvent.set(null);
  }

  protected startCreate(): void {
    const cat = this.resolveDefaultCategory();
    this.form.reset({ title: '', category: cat, date: this.selectedDate(), startTime: '10:00', endTime: '11:00', institution: '', reminder: '1 hora antes', allDay: false });
    this.conflict.set(null);
    this.editing.set('new');
  }

  protected startEdit(event: CalendarEventRecord): void {
    this.form.reset({ title: event.title, category: event.category, date: event.date, startTime: event.startTime ?? '10:00', endTime: event.endTime ?? '11:00', institution: event.institution ?? '', reminder: event.reminder ?? '', allDay: event.allDay });
    this.conflict.set(null);
    this.editing.set(event.id);
  }

  protected save(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (!value.allDay && value.endTime <= value.startTime) { this.form.controls.endTime.setErrors({ range: true }); return; }
    const input = {
      ownerUserId: DEMO_SENIOR_ID,
      title: value.title.trim(),
      category: value.category,
      sourceModule: this.editing() === 'new' ? 'MANUAL' : (this.calendar.events().find((e) => e.id === this.editing())?.sourceModule ?? 'MANUAL'),
      date: value.date,
      ...(value.allDay ? {} : { startTime: value.startTime, endTime: value.endTime }),
      allDay: value.allDay,
      ...(value.institution.trim() ? { institution: value.institution.trim() } : {}),
      ...(value.reminder.trim() ? { reminder: value.reminder.trim() } : {}),
      status: 'SCHEDULED' as const,
    };
    const id = this.editing();
    const result = id === 'new' ? this.calendar.create(input) : this.calendar.update(id!, input);
    if (result.conflicts.length) { this.conflict.set(result); return; }
    this.conflict.set(null);
    this.selectedDate.set(value.date);
    this.cursor.set(new Date(`${value.date}T12:00:00`));
    this.editing.set(null);
  }

  protected remove(id: string): void { this.calendar.delete(id); }

  private resolveDefaultCategory(): CalendarEventCategory {
    const filter = this.route.snapshot.queryParamMap.get('filter') as CalendarEventCategory | null;
    return filter ?? (this.isPensionCalendar ? 'PENSION' : 'OTHER');
  }

  private resolveInitialCategories(): Set<CalendarEventCategory> {
    const filter = this.route.snapshot.queryParamMap.get('filter') as CalendarEventCategory | null;
    return filter && CATEGORY_META.some((meta) => meta.key === filter)
      ? new Set([filter])
      : new Set(CATEGORY_META.map((meta) => meta.key));
  }

  private localDate(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }
}

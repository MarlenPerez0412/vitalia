import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Notification, NOTIFICATION_PRIORITY_LABELS, NotificationPriority } from '../../../core/models/notification.models';
import { NotificationService } from '../../../core/services/notification.service';
import { VitaliaIconComponent } from '../icon/vitalia-icon.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../status-badge/status-badge.component';
import { relativeTime } from './notification-time';

let nextId = 0;

const PRIORITY_VARIANT: Readonly<Record<NotificationPriority, StatusBadgeVariant>> = {
  LOW: 'normal',
  NORMAL: 'pending',
  HIGH: 'urgent',
  CRITICAL: 'emergency',
};

/**
 * Campana de notificaciones del Topbar. Mismo patron de apertura que UserMenu: click, Escape, click fuera,
 * foco devuelto al disparador y recorrido con flechas.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadgeComponent, VitaliaIconComponent],
  selector: 'app-notification-bell',
  template: `
    <div class="bell">
      <button #trigger class="icon-button" type="button" [attr.aria-expanded]="open()" [attr.aria-controls]="panelId" [attr.aria-label]="triggerLabel()" (click)="toggle()">
        <app-vitalia-icon name="bell" />
        @if (badge()) { <span class="count" aria-hidden="true">{{ badge() }}</span> }
      </button>
      <span class="sr-only" role="status" aria-live="polite">{{ announcement() }}</span>

      @if (open()) {
        <div #panel [id]="panelId" class="panel" role="group" aria-label="Notificaciones" (keydown)="onKeydown($event)">
          <div class="head">
            <strong>Notificaciones</strong>
            <button type="button" class="link" [disabled]="!unread()" (click)="markAll()">Marcar todas como leídas</button>
          </div>
          @if (items().length) {
            <ul>
              @for (item of items(); track item.id) {
                <li [class.unread]="!item.read">
                  <button type="button" class="open" (click)="openItem(item)">
                    <span class="row"><strong>{{ item.title }}</strong><small>{{ time(item) }}</small></span>
                    <span class="message">{{ item.message }}</span>
                    <span class="meta">
                      <app-status-badge [variant]="variant(item.priority)">{{ priorityLabel(item.priority) }}</app-status-badge>
                      <small>{{ item.read ? 'Leída' : 'Sin leer' }}</small>
                    </span>
                  </button>
                  @if (!item.read) { <button type="button" class="link mark" [attr.aria-label]="'Marcar como leída: ' + item.title" (click)="markOne(item)">Marcar como leída</button> }
                </li>
              }
            </ul>
          } @else {
            <p class="empty">No tienes notificaciones por ahora.</p>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly panelId = `notification-panel-${++nextId}`;
  protected readonly open = signal(false);
  protected readonly items = this.service.mine;
  protected readonly unread = this.service.unreadCount;
  protected readonly badge = computed(() => (this.unread() === 0 ? '' : this.unread() > 9 ? '9+' : String(this.unread())));
  protected readonly announcement = computed(() => (this.unread() === 0 ? 'Sin notificaciones pendientes' : `${this.unread()} ${this.unread() === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}`));
  protected readonly triggerLabel = computed(() => `Notificaciones, ${this.announcement().toLowerCase()}`);

  constructor() {
    effect((onCleanup) => {
      if (!this.open()) return;
      const handleOutsidePointer = (event: PointerEvent): void => {
        if (event.target instanceof Node && !this.host.nativeElement.contains(event.target)) this.close(false);
      };
      document.addEventListener('pointerdown', handleOutsidePointer, true);
      onCleanup(() => document.removeEventListener('pointerdown', handleOutsidePointer, true));
    });
  }

  protected time(item: Notification): string { return relativeTime(item.createdAt); }
  protected priorityLabel(priority: NotificationPriority): string { return NOTIFICATION_PRIORITY_LABELS[priority]; }
  protected variant(priority: NotificationPriority): StatusBadgeVariant { return PRIORITY_VARIANT[priority]; }

  protected toggle(): void { this.open() ? this.close() : this.openPanel(); }

  protected close(restoreFocus = true): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) afterNextRender(() => this.trigger()?.nativeElement.focus(), { injector: this.injector });
  }

  protected markOne(item: Notification): void { this.service.markAsRead(item.id); }
  protected markAll(): void { this.service.markAllAsRead(); }

  protected openItem(item: Notification): void {
    this.service.markAsRead(item.id);
    this.close(!item.actionRoute);
    if (item.actionRoute) void this.router.navigateByUrl(item.actionRoute);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
    const items = this.focusables();
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const targets: Record<string, number> = { ArrowDown: (current + 1) % items.length, ArrowUp: (current - 1 + items.length) % items.length, Home: 0, End: items.length - 1 };
    const target = targets[event.key];
    if (target !== undefined) { event.preventDefault(); items[target].focus(); return; }
    if (event.key !== 'Tab') return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  private openPanel(): void {
    this.open.set(true);
    afterNextRender(() => this.focusables()[0]?.focus(), { injector: this.injector });
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.panel()?.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
  }
}

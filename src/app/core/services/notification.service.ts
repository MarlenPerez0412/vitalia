import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import seed from '../mock/notifications.seed.json';
import { Notification, NotificationInput, NotificationRole, NotificationType } from '../models/notification.models';
import { readStored, removeStored, watchStorage, writeStored } from '../utils/storage-sync';
import { MockDatabaseService } from './mock-database.service';

const STORAGE_KEY = 'vitalia.notifications';
const MAX_STORED = 100;

function isNotificationList(value: unknown): value is Notification[] { return Array.isArray(value); }

type SeedEntry = Omit<Notification, 'createdAt'> & { minutesAgo: number };

function buildSeed(): Notification[] {
  const now = Date.now();
  return (seed as SeedEntry[]).map(({ minutesAgo, ...item }) => ({ ...item, createdAt: new Date(now - minutesAgo * 60_000).toISOString() }));
}

/**
 * Notificaciones mock de todos los roles. El JSON inicial solo es semilla: los cambios en ejecucion
 * (nuevas, leidas) se guardan en localStorage y se reflejan en las demas pestanas abiertas. Cada persona ve unicamente las dirigidas a su rol y usuario.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);
  private readonly database = inject(MockDatabaseService);
  private readonly store = signal<readonly Notification[]>(this.restore());

  constructor() {
    // Otra pestana (p. ej. Maria en una y Ana en otra) escribio: reflejar sus cambios sin recargar.
    watchStorage(STORAGE_KEY, () => this.store.set(this.restore()));
  }

  /** Notificaciones de la sesion actual, mas recientes primero. */
  readonly mine = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    return this.store()
      .filter((item) => item.targetRole === user.role && (!item.targetUserId || item.targetUserId === user.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
  readonly unreadCount = computed(() => this.mine().filter((item) => !item.read).length);

  /**
   * Crea una notificacion. Evita duplicados: con `once` no se repite nunca el mismo hecho (rol, usuario, tipo, titulo y entidad);
   * sin `once` no se repite mientras exista una equivalente sin leer.
   */
  notify(input: NotificationInput, options: { once?: boolean } = {}): Notification | null {
    const duplicate = this.store().some((item) =>
      item.targetRole === input.targetRole && item.targetUserId === input.targetUserId && item.type === input.type
      && item.relatedEntityId === input.relatedEntityId && item.title === input.title
      && (options.once ? input.relatedEntityId !== undefined : !item.read && item.message === input.message));
    if (duplicate) return null;
    const created: Notification = { ...input, id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), read: false };
    this.commit([created, ...this.store()]);
    return created;
  }

  markAsRead(id: string): void {
    if (!this.store().some((item) => item.id === id && !item.read)) return;
    this.commit(this.store().map((item) => (item.id === id ? { ...item, read: true } : item)));
  }

  /** Marca como leidas solo las del usuario actual. */
  markAllAsRead(): void {
    const ids = new Set(this.mine().filter((item) => !item.read).map((item) => item.id));
    if (!ids.size) return;
    this.commit(this.store().map((item) => (ids.has(item.id) ? { ...item, read: true } : item)));
  }

  /** Marca como leidas las pendientes de una entidad (p. ej. al tomar el medicamento deja de estar pendiente). */
  markEntityAsRead(relatedEntityId: string, role: NotificationRole, types?: readonly NotificationType[]): void {
    const match = (item: Notification): boolean => !item.read && item.targetRole === role && item.relatedEntityId === relatedEntityId && (!types || types.includes(item.type));
    if (!this.store().some(match)) return;
    this.commit(this.store().map((item) => (match(item) ? { ...item, read: true } : item)));
  }

  /** Restablece las notificaciones a la semilla inicial (datos de demostracion). */
  resetNotifications(): void {
    removeStored(STORAGE_KEY);
    this.store.set(buildSeed());
    this.database.updateCollection('notifications', () => buildSeed());
  }

  private commit(items: readonly Notification[]): void {
    const trimmed = items.slice(0, MAX_STORED);
    this.store.set(trimmed);
    writeStored(STORAGE_KEY, trimmed);
    this.database.updateCollection('notifications', () => [...trimmed]);
  }

  private restore(): readonly Notification[] {
    return readStored(STORAGE_KEY, isNotificationList) ?? buildSeed();
  }
}

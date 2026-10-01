import { Role } from './domain.models';

export type NotificationRole = Extract<Role, 'SENIOR' | 'CAREGIVER' | 'HEALTH' | 'ADMIN'>;
export type NotificationType = 'EMERGENCY' | 'MEDICATION' | 'WELLBEING' | 'PREVENT' | 'CAREGIVER' | 'HEALTH' | 'ADMIN' | 'SYSTEM';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

/** Notificacion mock. Cada una se dirige a un rol y, opcionalmente, a un usuario concreto. */
export interface Notification {
  id: string;
  targetRole: NotificationRole;
  targetUserId?: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  priority: NotificationPriority;
  actionRoute?: string;
  relatedEntityId?: string;
}

export type NotificationInput = Omit<Notification, 'id' | 'createdAt' | 'read'>;

export const NOTIFICATION_PRIORITY_LABELS: Readonly<Record<NotificationPriority, string>> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

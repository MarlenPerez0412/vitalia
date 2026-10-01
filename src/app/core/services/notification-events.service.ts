import { inject, Injectable } from '@angular/core';
import { EMERGENCY_TYPE_LABELS, EmergencyEventRecord, EmergencyType } from '../models/emergency.models';
import { NotificationService } from './notification.service';
import { SHARING_LABELS, SharingConsentService, SharingKey } from './sharing-consent.service';
import { MockDatabaseService } from './mock-database.service';

const EMERGENCY_PHRASE: Readonly<Record<EmergencyType, string>> = {
  HELP: 'solicitó ayuda',
  SICK: 'reportó malestar',
  FALL: 'reportó una caída',
  DIZZY: 'reportó mareo',
  OTHER: 'solicitó ayuda',
};

/**
 * Traduce eventos reales del mock en notificaciones por rol. Concentra aqui las reglas de a quien avisar,
 * para que los servicios de dominio solo declaren que ocurrio. HEALTH no recibe emergencias familiares.
 */
@Injectable({ providedIn: 'root' })
export class NotificationEventsService {
  private readonly notifications = inject(NotificationService);
  private readonly consent = inject(SharingConsentService);
  private readonly database = inject(MockDatabaseService);

  /** Resuelve destinatarios desde usuarios y vínculos mock; evita ids mágicos en las reglas de notificación. */
  private get demo() {
    const data = this.database.snapshot();
    const senior = data.users.find((item) => item.role === 'SENIOR' && item.active) ?? data.users.find((item) => item.role === 'SENIOR');
    const caregiverLink = data.seniorCaregiverLinks.find((item) => item.seniorId === senior?.id && item.active);
    const healthLink = data.seniorHealthLinks.find((item) => item.seniorId === senior?.id && item.active);
    return {
      seniorId: senior?.id,
      seniorName: senior?.name ?? 'La persona vinculada',
      caregiverId: caregiverLink?.caregiverId,
      healthId: healthLink?.healthUserId,
      adminId: data.users.find((item) => item.role === 'ADMIN' && item.active)?.id,
    };
  }

  emergencyRegistered(event: EmergencyEventRecord): void {
    const DEMO = this.demo;
    this.notifications.notify({ targetRole: 'SENIOR', targetUserId: DEMO.seniorId, type: 'EMERGENCY', title: 'Emergencia registrada', message: 'Tu solicitud de ayuda quedó registrada. Tu familiar fue informado en esta demostración.', priority: 'HIGH', actionRoute: '/senior/emergency', relatedEntityId: event.id });
    if (!this.consent.allows('emergencies')) return;
    this.notifications.notify({ targetRole: 'CAREGIVER', targetUserId: DEMO.caregiverId, type: 'EMERGENCY', title: EMERGENCY_TYPE_LABELS[event.type], message: `${event.seniorName} ${EMERGENCY_PHRASE[event.type]}.`, priority: 'CRITICAL', actionRoute: '/care/emergencies', relatedEntityId: event.id });
  }

  /** Care atendio la emergencia: Senior se entera siempre; su red solo si comparte emergencias. */
  emergencyAttended(event: EmergencyEventRecord): void {
    const DEMO = this.demo;
    this.notifications.notify({ targetRole: 'SENIOR', targetUserId: DEMO.seniorId, type: 'EMERGENCY', title: 'Emergencia atendida', message: 'Tu familiar atendió tu solicitud de ayuda.', priority: 'NORMAL', actionRoute: '/senior/emergency', relatedEntityId: `${event.id}-attended` });
    if (!this.consent.allows('emergencies')) return;
    this.notifications.notify({ targetRole: 'CAREGIVER', targetUserId: DEMO.caregiverId, type: 'EMERGENCY', title: 'Emergencia atendida', message: `La emergencia de ${event.seniorName} fue atendida.`, priority: 'NORMAL', actionRoute: '/care/emergencies', relatedEntityId: `${event.id}-attended` });
  }

  emergencyResolved(event: EmergencyEventRecord): void {
    const DEMO = this.demo;
    this.notifications.notify({ targetRole: 'SENIOR', targetUserId: DEMO.seniorId, type: 'EMERGENCY', title: 'Emergencia resuelta', message: 'Tu familiar marcó la solicitud como resuelta.', priority: 'NORMAL', actionRoute: '/senior/emergency', relatedEntityId: `${event.id}-resolved` });
    if (this.consent.allows('emergencies')) this.notifications.notify({ targetRole: 'CAREGIVER', targetUserId: DEMO.caregiverId, type: 'EMERGENCY', title: 'Emergencia resuelta', message: `La solicitud de ${event.seniorName} quedó resuelta.`, priority: 'LOW', actionRoute: '/care/emergencies', relatedEntityId: `${event.id}-resolved` });
  }

  medicationSkipped(medicationId: string, medicationName: string): void {
    const DEMO = this.demo;
    const relatedEntityId = `skip-${medicationId}-${new Date().toISOString().slice(0, 10)}`;
    this.notifications.notify({ targetRole: 'SENIOR', targetUserId: DEMO.seniorId, type: 'MEDICATION', title: 'Medicamento omitido', message: `Registramos ${medicationName} como omitido.`, priority: 'HIGH', actionRoute: '/senior/medications/history', relatedEntityId });
    if (!this.consent.allows('medications')) return;
    this.notifications.notify({ targetRole: 'CAREGIVER', targetUserId: DEMO.caregiverId, type: 'CAREGIVER', title: 'Toma omitida', message: `${DEMO.seniorName} omitió ${medicationName}.`, priority: 'HIGH', actionRoute: '/care/medications', relatedEntityId });
  }

  /** Al tomar el medicamento ya no queda pendiente el aviso a Senior ni a su cuidadora. */
  medicationTaken(medicationId: string): void {
    this.notifications.markEntityAsRead(medicationId, 'SENIOR', ['MEDICATION']);
    this.notifications.markEntityAsRead(medicationId, 'CAREGIVER', ['CAREGIVER']);
  }

  /** Cambio frente a la rutina detectado por Prevent: Senior, su cuidadora y su profesional (autorizados en la demo). */
  preventChangeDetected(): void {
    const DEMO = this.demo;
    const relatedEntityId = 'prevent-activity-drop';
    const once = { once: true };
    this.notifications.notify({ targetRole: 'SENIOR', targetUserId: DEMO.seniorId, type: 'PREVENT', title: 'VITALIA Prevent', message: 'VITALIA detectó un cambio respecto a tu rutina habitual.', priority: 'NORMAL', actionRoute: '/senior/prevent', relatedEntityId }, once);
    if (this.consent.allows('wellbeing')) this.notifications.notify({ targetRole: 'CAREGIVER', targetUserId: DEMO.caregiverId, type: 'PREVENT', title: 'Cambio de bienestar', message: `${DEMO.seniorName} tiene actividad menor a la habitual.`, priority: 'NORMAL', actionRoute: '/care/activity', relatedEntityId }, once);
    if (this.consent.allows('wellbeing')) this.notifications.notify({ targetRole: 'HEALTH', targetUserId: DEMO.healthId, type: 'HEALTH', title: 'Alerta de seguimiento', message: `${DEMO.seniorName} tiene una nueva alerta de seguimiento.`, priority: 'HIGH', actionRoute: '/health/alerts', relatedEntityId }, once);
  }

  /** Check-in con senales de malestar: solo se comparte con la red si Maria autorizo Bienestar. */
  wellbeingChanged(mood: number, sleep: number, discomfort: string): void {
    const DEMO = this.demo;
    this.notifications.markEntityAsRead('checkin-daily', 'SENIOR', ['WELLBEING']);
    const concerning = mood <= 2 || sleep <= 2 || discomfort === 'Necesito apoyo';
    if (!concerning || !this.consent.allows('wellbeing')) return;
    const relatedEntityId = `checkin-${new Date().toISOString().slice(0, 10)}`;
    this.notifications.notify({ targetRole: 'CAREGIVER', targetUserId: DEMO.caregiverId, type: 'WELLBEING', title: 'Cambio de bienestar', message: `${DEMO.seniorName} reportó un cambio en su bienestar.`, priority: 'HIGH', actionRoute: '/care/wellbeing', relatedEntityId }, { once: true });
  }

  /** Maria autoriza o revoca compartir algo: se avisa a su cuidadora. */
  sharingChanged(key: SharingKey, enabled: boolean): void {
    const DEMO = this.demo;
    this.notifications.notify({ targetRole: 'CAREGIVER', targetUserId: DEMO.caregiverId, type: 'CAREGIVER', title: 'Privacidad', message: `${DEMO.seniorName} ${enabled ? 'autorizó' : 'revocó'} compartir ${SHARING_LABELS[key]}.`, priority: key === 'emergencies' && !enabled ? 'HIGH' : 'NORMAL', actionRoute: '/care/people', relatedEntityId: `sharing-${key}-${Date.now()}` });
  }

  /** Profesional registra un seguimiento: confirmacion para Health y aviso a Senior si comparte bienestar. */
  followUpRegistered(id: string, patientName: string, task: string): void {
    const DEMO = this.demo;
    this.notifications.notify({ targetRole: 'HEALTH', targetUserId: DEMO.healthId, type: 'HEALTH', title: 'Seguimiento registrado', message: `Registraste el seguimiento «${task}» de ${patientName}.`, priority: 'NORMAL', actionRoute: '/health/follow-up', relatedEntityId: id });
    if (!this.consent.allows('wellbeing')) return;
    this.notifications.notify({ targetRole: 'SENIOR', targetUserId: DEMO.seniorId, type: 'HEALTH', title: 'Seguimiento de tu profesional', message: `Tu profesional de salud registró un seguimiento: ${task}.`, priority: 'LOW', actionRoute: '/senior/health', relatedEntityId: id });
  }

  /** Eventos de auditoria de Admin: solo se avisa del hecho administrativo, sin datos medicos. */
  adminAudit(action: string, resourceType: string, resourceId: string, auditId: string): void {
    const DEMO = this.demo;
    const base = { targetRole: 'ADMIN', targetUserId: DEMO.adminId, type: 'ADMIN', relatedEntityId: auditId } as const;
    const target = resourceId.split(' · ')[0];
    const send = (title: string, message: string, priority: 'LOW' | 'NORMAL' | 'HIGH', actionRoute: string, relatedEntityId = auditId): void => {
      this.notifications.notify({ ...base, relatedEntityId, title, message, priority, actionRoute });
    };
    switch (action) {
      case 'Alta de usuario': send('Usuario creado', 'Usuario creado correctamente.', 'NORMAL', '/admin/users'); break;
      case 'Edición de usuario': send('Usuario actualizado', 'Se actualizaron los datos de un usuario.', 'LOW', '/admin/users'); break;
      case 'Usuario desactivado': send('Usuario desactivado', 'Un usuario fue desactivado.', 'HIGH', '/admin/users'); break;
      case 'Usuario activado': send('Usuario activado', 'Un usuario fue activado.', 'LOW', '/admin/users'); break;
      case 'Alta de rol': send('Rol creado', `Se creó el rol ${target}.`, 'NORMAL', '/admin/roles'); break;
      case 'Edición de rol': send('Rol editado', `Se editó el rol ${target}.`, 'LOW', '/admin/roles'); break;
      case 'Rol activado':
      case 'Rol desactivado': send(action, `${action}: ${target}.`, 'NORMAL', '/admin/roles'); break;
      case 'Permiso asignado':
      case 'Permiso retirado': send('Permisos modificados', `Se modificaron permisos del rol ${target}.`, 'HIGH', '/admin/permissions', `perm-${target}`); break;
      default: if (resourceType !== 'Sesión') send('Evento de auditoría', action, 'LOW', '/admin/audit');
    }
  }
}

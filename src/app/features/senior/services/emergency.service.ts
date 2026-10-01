import { computed, inject, Injectable, signal } from '@angular/core';
import { EmergencyEventRecord, EmergencySource, EmergencyType } from '../../../core/models/emergency.models';
import { LocationStatus, VitaliaLocation } from '../../../core/models/location.models';
import { LiaSpeechService } from '../../../core/services/lia-speech.service';
import { LocationService } from '../../../core/services/location.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { EmergencyReason, EmergencyStep } from '../models/senior.models';
import { ContactsService } from './contacts.service';
import { SeniorStateService } from './senior-state.service';

export interface EmergencyRequest {
  type: EmergencyType;
  reason: EmergencyReason;
  source: EmergencySource;
}

const TYPE_BY_REASON: Readonly<Record<EmergencyReason, EmergencyType>> = {
  'Me siento mal': 'SICK',
  'Me caí': 'FALL',
  'Estoy mareada': 'DIZZY',
  'Otra emergencia': 'OTHER',
  'Necesito ayuda': 'HELP',
};

/** Pasos en los que no se acepta iniciar otra solicitud. */
const BUSY_STEPS: readonly EmergencyStep[] = ['countdown', 'confirmed', 'locating', 'location-fallback', 'contacted', 'shared'];
const BUTTON_TICK_MS = 650;
const VOICE_TICK_MS = 1000;

/**
 * Flujo unico de emergencia para todas las fuentes: boton (BUTTON), conversacion con LIA (LIA) y comandos de voz
 * (GLOBAL_VOICE). Pide ubicacion solo tras confirmar, con fallback demo, y registra un evento simulado:
 * nunca contacta servicios reales. En las solicitudes por voz, LIA narra el avance real (ubicacion, registro)
 * con prioridad critica y sin afirmar avisos que no ocurren.
 */
@Injectable({ providedIn: 'root' })
export class EmergencyService {
  private readonly state = inject(SeniorStateService);
  private readonly locationService = inject(LocationService);
  private readonly permissions = inject(PermissionsService);
  private readonly speech = inject(LiaSpeechService);
  private timers: ReturnType<typeof setTimeout>[] = [];
  /** Invalida resultados asincronos (permiso, GPS) si el flujo se cancela o reinicia. */
  private flowId = 0;

  readonly contact = inject(ContactsService).primaryEmergencyContact;
  readonly step = signal<EmergencyStep>('idle');
  readonly reason = signal<EmergencyReason | null>(null);
  readonly type = signal<EmergencyType>('OTHER');
  readonly source = signal<EmergencySource>('BUTTON');
  readonly countdown = signal(3);
  /** `true` en solicitudes por voz o LIA: al terminar la cuenta regresiva avanza sin otro toque. */
  readonly autoConfirm = signal(false);
  readonly consentOpen = signal(false);
  readonly resolvedLocation = signal<VitaliaLocation | null>(null);
  readonly failure = signal<LocationStatus | 'declined'>('error');
  readonly lastEvent = signal<EmergencyEventRecord | null>(null);

  /** Hay una solicitud en curso (se muestra un aviso si la persona sale de la pantalla de emergencia). */
  readonly inProgress = computed(() => BUSY_STEPS.includes(this.step()));
  /** Momentos en los que "sí" o "cancelar" por voz tienen sentido. */
  readonly awaitingAnswer = computed(() => ['countdown', 'confirmed'].includes(this.step()) || this.consentOpen());

  selectReason(reason: EmergencyReason): void {
    if (this.inProgress()) return;
    this.reason.set(reason);
    this.type.set(TYPE_BY_REASON[reason]);
    this.source.set('BUTTON');
    this.step.set('selected');
  }

  /** Boton SOS: cuenta regresiva breve y confirmacion explicita (flujo original). */
  startCountdown(): void {
    if (!this.reason() || this.inProgress()) return;
    this.beginCountdown(3, BUTTON_TICK_MS, false);
  }

  /** Voz global o LIA: "Voy a iniciar la solicitud de ayuda. Puedes cancelar." y cuenta regresiva de 5 s. */
  startVoiceRequest(request: EmergencyRequest, seconds = 5): boolean {
    if (this.inProgress()) return false;
    this.prepare(request);
    this.beginCountdown(seconds, VOICE_TICK_MS, true);
    return true;
  }

  /** Solicitud ya confirmada por la persona (p. ej. "Me siento mal" -> "Solicitar ayuda"): pasa directo a ubicacion. */
  confirmRequest(request: EmergencyRequest): boolean {
    if (this.inProgress()) return false;
    this.prepare(request);
    void this.confirm();
    return true;
  }

  /** La ubicacion solo se solicita despues de confirmar; cancelar antes nunca la pide. */
  async confirm(): Promise<void> {
    if (!this.reason()) return;
    this.clearTimers();
    const flow = ++this.flowId;
    this.step.set('locating');
    const needsExplanation = await this.permissions.needsExplanation('geolocation');
    if (flow !== this.flowId) return;
    if (needsExplanation) { this.consentOpen.set(true); return; }
    await this.locate(flow);
  }

  async acceptLocationConsent(): Promise<void> {
    this.permissions.markExplanationSeen('geolocation');
    this.consentOpen.set(false);
    await this.locate(this.flowId);
  }

  declineLocationConsent(): void {
    this.consentOpen.set(false);
    this.failure.set('declined');
    this.step.set('location-fallback');
    this.narrate('Está bien. No usaré tu ubicación.');
  }

  async retryLocation(): Promise<void> {
    this.step.set('locating');
    await this.locate(this.flowId);
  }

  useDemoLocation(): void { this.proceed(this.locationService.getDemoPosition()); }
  continueWithoutLocation(): void { this.proceed(null); }

  cancel(): void {
    // Lo que LIA estuviera narrando de esta solicitud ya no es cierto.
    if (this.source() !== 'BUTTON') this.speech.stop();
    this.flowId++;
    this.consentOpen.set(false);
    this.clearTimers();
    this.step.set('cancelled');
  }

  reset(): void {
    this.flowId++;
    this.clearTimers();
    this.consentOpen.set(false);
    this.reason.set(null);
    this.countdown.set(3);
    this.resolvedLocation.set(null);
    this.step.set('idle');
  }

  private prepare(request: EmergencyRequest): void {
    this.reset();
    this.reason.set(request.reason);
    this.type.set(request.type);
    this.source.set(request.source);
  }

  private beginCountdown(seconds: number, tickMs: number, auto: boolean): void {
    this.clearTimers();
    this.autoConfirm.set(auto);
    this.countdown.set(seconds);
    this.step.set('countdown');
    const timer = globalThis.setInterval(() => {
      // Por voz, la cuenta espera a que LIA termine de hablar: con el microfono cerrado no se podria decir "cancelar".
      if (auto && this.speech.isSpeaking()) return;
      this.countdown.update((value) => value - 1);
      if (this.countdown() > 0) return;
      globalThis.clearInterval(timer);
      if (auto) void this.confirm();
      else this.step.set('confirmed');
    }, tickMs);
    this.timers.push(timer);
  }

  private async locate(flow: number): Promise<void> {
    this.narrate('Estoy obteniendo tu ubicación.');
    const location = await this.locationService.getCurrentPosition();
    if (flow !== this.flowId) return;
    if (location) { this.narrate('Ubicación obtenida.'); this.proceed(location); return; }
    this.failure.set(this.locationService.status());
    this.step.set('location-fallback');
    this.narrate('No pude obtener tu ubicación actual.');
  }

  private proceed(location: VitaliaLocation | null): void {
    const reason = this.reason(); if (!reason) return;
    this.resolvedLocation.set(location);
    this.step.set('contacted');
    this.timers.push(globalThis.setTimeout(() => this.step.set('shared'), 700));
    this.timers.push(globalThis.setTimeout(() => {
      this.lastEvent.set(this.state.recordEmergency(reason, location ?? undefined, { type: this.type(), source: this.source(), contact: this.contact() }));
      this.step.set('registered');
      // Solo se registra en VITALIA (simulado): no se afirma haber avisado a nadie.
      this.narrate('Tu solicitud de ayuda quedó registrada.');
    }, 1400));
  }

  /** Voz de LIA para solicitudes iniciadas por voz; el boton conserva su flujo silencioso. */
  private narrate(text: string): void {
    if (this.source() === 'BUTTON') return;
    void this.speech.speak(text, { priority: 'CRITICAL' });
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => { globalThis.clearTimeout(timer); globalThis.clearInterval(timer); });
    this.timers = [];
  }
}

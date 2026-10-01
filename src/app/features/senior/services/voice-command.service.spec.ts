import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AudioCaptureService } from '../../../core/services/audio-capture.service';
import { AudioRecording } from '../../../core/models/permission.models';
import { LiaSpeechService } from '../../../core/services/lia-speech.service';
import { LocationService } from '../../../core/services/location.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { VoiceApiService } from '../../../core/services/voice-api.service';
import { VoiceSessionCoordinatorService } from '../../../core/services/voice-session-coordinator.service';
import { ContactsService } from './contacts.service';
import { EmergencyService } from './emergency.service';
import { SeniorStateService } from './senior-state.service';
import { VoiceCommandService } from './voice-command.service';

describe('VoiceCommandService', () => {
  const startContinuous = vi.fn();
  const stopContinuous = vi.fn();
  const transcribe = vi.fn();
  let emitUtterance: ((recording: AudioRecording) => void) | undefined;
  const recording: AudioRecording = { blob: new Blob(['audio']), mimeType: 'audio/wav', durationMs: 100, createdAt: '' };
  let voice: VoiceCommandService;
  let emergency: EmergencyService;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  let navigate: ReturnType<typeof vi.spyOn>;
  let speak: ReturnType<typeof vi.spyOn>;
  const spoken = (): string[] => speak.mock.calls.map(([text]: unknown[]) => text as string);
  const lastSpoken = () => speak.mock.calls.at(-1) as [string, { priority: string }];

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    startContinuous.mockReset().mockResolvedValue(true);
    stopContinuous.mockReset();
    transcribe.mockReset();
    emitUtterance = undefined;
    startContinuous.mockImplementation(async (onUtterance: (recording: AudioRecording) => void) => {
      emitUtterance = onUtterance;
      return true;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AudioCaptureService, useValue: { startContinuous, stopContinuous, hearingSpeech: () => false, errorMessage: () => '' } },
        { provide: VoiceApiService, useValue: { transcribe } },
        { provide: PermissionsService, useValue: { checkMicrophonePermission: async () => 'granted', needsExplanation: async () => false, markExplanationSeen: vi.fn() } },
        { provide: LocationService, useValue: { getCurrentPosition: vi.fn().mockResolvedValue(null), getDemoPosition: vi.fn(), status: () => 'denied' } },
      ],
    });
    const router = TestBed.inject(Router);
    navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    speak = vi.spyOn(TestBed.inject(LiaSpeechService), 'speak').mockResolvedValue(true);
    voice = TestBed.inject(VoiceCommandService);
    emergency = TestBed.inject(EmergencyService);
  });
  afterEach(() => {
    // Ninguna frase hablada nombra a "LIA" (un eco no puede activar comandos) ni afirma avisos o llamadas que no ocurren.
    for (const text of spoken()) expect(text).not.toMatch(/\blia\b|notifiqu|notificad|avis[eé]|ya llam|le estoy marcando/i);
    vi.useRealTimers();
  });

  it('only turns on after explicit consent', async () => {
    await voice.requestEnable();
    expect(voice.consentOpen()).toBe(true);
    expect(startContinuous).not.toHaveBeenCalled();
    await voice.acceptConsent();
    expect(startContinuous).toHaveBeenCalledOnce();
    expect(voice.state()).toBe('wake-listening');
    voice.disable();
    expect(stopContinuous).toHaveBeenCalled();
    expect(voice.state()).toBe('off');
  });

  it('"LIA necesito ayuda" starts the shared emergency flow with a cancellable countdown', async () => {
    await voice.handleTranscript('lia necesito ayuda');
    expect(emergency.step()).toBe('countdown');
    expect(emergency.countdown()).toBe(5);
    expect(emergency.type()).toBe('HELP');
    expect(emergency.source()).toBe('GLOBAL_VOICE');
    expect(navigateByUrl).toHaveBeenCalledWith('/senior/emergency');
    expect(voice.feedback()?.message).toBe('Voy a iniciar la solicitud de ayuda. Puedes cancelar.');
    await voice.handleTranscript('cancelar');
    expect(emergency.step()).toBe('cancelled');
  });

  it('"LIA me caí" is registered as a FALL', async () => {
    await voice.handleTranscript('lia me caí');
    expect(emergency.type()).toBe('FALL');
    expect(emergency.reason()).toBe('Me caí');
  });

  it('"LIA me siento mal" asks first and "sí" requests help', async () => {
    await voice.handleTranscript('lia me siento mal');
    expect(voice.prompt()).toEqual({ kind: 'SICK' });
    expect(voice.feedback()?.message).toBe('He entendido que te sientes mal.');
    expect(emergency.step()).toBe('idle');
    await voice.handleTranscript('sí');
    expect(voice.prompt()).toBeNull();
    expect(emergency.type()).toBe('SICK');
    expect(emergency.step()).not.toBe('idle');
  });

  it('"LIA llama a mi hija" resolves the contact from the central list and never dials by voice', async () => {
    await voice.handleTranscript('lia llama a mi hija');
    const prompt = voice.prompt();
    expect(prompt?.kind).toBe('CALL');
    expect(prompt?.kind === 'CALL' && prompt.contact).toEqual(TestBed.inject(ContactsService).findByRelationship('hija'));
    expect(voice.feedback()?.message).toBe('Encontré a Ana Hernández. ¿Quieres que abra el marcador para llamarla?');
    await voice.handleTranscript('sí');
    expect(voice.prompt()?.kind).toBe('CALL');
    expect(voice.feedback()?.message).toContain('Pulsa «Llamar a Ana»');
  });

  it('opens emergency, location (requesting it) and answers the next medication', async () => {
    await voice.handleTranscript('lia abre emergencia');
    expect(navigateByUrl).toHaveBeenCalledWith('/senior/emergency');
    expect(emergency.step()).toBe('idle');
    await voice.handleTranscript('lia dónde estoy');
    expect(navigate).toHaveBeenCalledWith(['/senior/location'], expect.objectContaining({ queryParams: expect.objectContaining({ solicitar: expect.any(Number) }) }));
    const answer = voice.handleTranscript('lia qué medicamento me toca');
    await vi.advanceTimersByTimeAsync(700);
    await answer;
    expect(voice.feedback()?.message).toContain('Metformina');
  });

  it('silently ignores speech without the wake word', async () => {
    await voice.handleTranscript('hoy hace buen día para salir');
    expect(voice.feedback()).toBeNull();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('keeps passive listening until "Hola LIA" and reuses the same listener for the command', async () => {
    transcribe.mockResolvedValueOnce('hoy hace buen día');
    await voice.acceptConsent();
    expect(voice.state()).toBe('wake-listening');
    emitUtterance?.(recording);
    await vi.waitFor(() => expect(transcribe).toHaveBeenCalledOnce());
    expect(voice.state()).toBe('wake-listening');
    expect(navigateByUrl).not.toHaveBeenCalled();

    transcribe.mockResolvedValueOnce('hola lia');
    emitUtterance?.(recording);
    await vi.waitFor(() => expect(voice.state()).toBe('command-listening'));
    expect(navigateByUrl).not.toHaveBeenCalled();

    transcribe.mockResolvedValueOnce('lia abre emergencia');
    emitUtterance?.(recording);
    await vi.waitFor(() => expect(navigateByUrl).toHaveBeenCalledWith('/senior/emergency'));
    expect(startContinuous).toHaveBeenCalledOnce();
  });

  it('speaks the "me siento mal" flow: question, confirmation and the real emergency progress', async () => {
    await voice.handleTranscript('lia me siento mal');
    expect(lastSpoken()).toEqual(['Sí, te escuché. Entiendo que te sientes mal. ¿Quieres que pida ayuda?', expect.objectContaining({ priority: 'CRITICAL' })]);
    await voice.handleTranscript('sí');
    await vi.advanceTimersByTimeAsync(0);
    expect(spoken()).toEqual(expect.arrayContaining(['De acuerdo. Voy a iniciar la solicitud de ayuda.', 'Estoy obteniendo tu ubicación.', 'No pude obtener tu ubicación actual.']));
    emergency.continueWithoutLocation();
    await vi.advanceTimersByTimeAsync(1400);
    expect(emergency.step()).toBe('registered');
    expect(spoken().at(-1)).toBe('Tu solicitud de ayuda quedó registrada.');
  });

  it('"LIA me caí" asks and "sí" starts the request without waiting for the countdown', async () => {
    await voice.handleTranscript('lia me caí');
    expect(spoken().at(-1)).toContain('Te escuché. Entiendo que te has caído. ¿Quieres activar la emergencia?');
    expect(emergency.step()).toBe('countdown');
    await voice.handleTranscript('sí');
    expect(emergency.step()).not.toBe('countdown');
    expect(spoken()).toContain('De acuerdo. Voy a iniciar la solicitud de ayuda.');
  });

  it('"LIA necesito ayuda" answers and "cancelar" confirms the real cancellation', async () => {
    await voice.handleTranscript('lia necesito ayuda');
    expect(spoken().at(-1)).toBe('Te escuché. Estoy contigo. ¿Quieres que active la solicitud de ayuda y contacte a tu familiar de emergencia?');
    await voice.handleTranscript('cancelar');
    expect(emergency.step()).toBe('cancelled');
    expect(lastSpoken()).toEqual(['Está bien. He cancelado la acción.', expect.objectContaining({ priority: 'CRITICAL', interrupt: true })]);
    await voice.handleTranscript('lia cancelar');
    expect(spoken().at(-1)).toBe('No hay nada que cancelar.');
  });

  it('calls: names the contact from the data, keeps the confirmation and only says it opens the dialer', async () => {
    const contacts = TestBed.inject(ContactsService);
    const daughter = contacts.findByRelationship('hija')!;
    const first = daughter.name.split(' ')[0];
    await voice.handleTranscript('lia llama a mi hija');
    expect(lastSpoken()).toEqual([`Encontré a ${daughter.name}. ¿Quieres que abra el marcador para llamarla?`, expect.objectContaining({ priority: 'HIGH' })]);
    await voice.handleTranscript('sí');
    expect(spoken().at(-1)).toBe(`De acuerdo. Para abrir el marcador, pulsa Llamar a ${first}.`);
    voice.announceCall(daughter);
    expect(spoken().at(-1)).toBe(`De acuerdo. Voy a abrir el marcador para llamar a ${first}.`);
    await voice.handleTranscript('no gracias');
    expect(voice.prompt()).toBeNull();
    expect(spoken().at(-1)).toBe('Está bien. He cancelado la acción.');

    await voice.handleTranscript('lia llama a mi contacto de emergencia');
    expect(spoken().at(-1)).toBe(`Encontré a tu contacto principal de emergencia, ${contacts.primaryEmergencyContact()!.name}. ¿Quieres llamarle?`);
  });

  it('location and medications answer by voice with the real data', async () => {
    await voice.handleTranscript('lia dónde estoy');
    expect(lastSpoken()).toEqual(['Sí, te escuché. Estoy buscando tu ubicación.', expect.objectContaining({ priority: 'HIGH' })]);

    let answer = voice.handleTranscript('lia qué medicamento me toca');
    await vi.advanceTimersByTimeAsync(700);
    await answer;
    expect(spoken().at(-1)).toBe('Tu próximo medicamento es Metformina de 500 miligramos a las 10 de la mañana. ¿Quieres que marque la toma como realizada cuando lo tomes?');

    const state = TestBed.inject(SeniorStateService);
    state.medications().filter((item) => item.status !== 'TAKEN').forEach((item) => state.takeMedication(item.id));
    answer = voice.handleTranscript('lia qué pastilla me toca');
    await vi.advanceTimersByTimeAsync(700);
    await answer;
    expect(spoken().at(-1)).toBe('No tienes medicamentos pendientes en este momento.');
  });

  it('pauses while LIA speaks and resumes afterwards', async () => {
    await voice.requestEnable();
    await voice.acceptConsent();
    const coordinator = TestBed.inject(VoiceSessionCoordinatorService);
    coordinator.beginSpeech();
    expect(stopContinuous).toHaveBeenCalled();
    expect(voice.state()).toBe('speaking');
    coordinator.endSpeech();
    await vi.waitFor(() => expect(voice.state()).toBe('wake-listening'));
    expect(startContinuous).toHaveBeenCalledTimes(2);
  });

  it('pauses while LIA uses the microphone and resumes afterwards', async () => {
    await voice.requestEnable();
    await voice.acceptConsent();
    const coordinator = TestBed.inject(VoiceSessionCoordinatorService);
    coordinator.acquireLia();
    expect(stopContinuous).toHaveBeenCalled();
    expect(voice.state()).toBe('paused-lia');
    coordinator.releaseLia();
    await vi.waitFor(() => expect(voice.state()).toBe('wake-listening'));
    expect(startContinuous).toHaveBeenCalledTimes(2);
  });
});

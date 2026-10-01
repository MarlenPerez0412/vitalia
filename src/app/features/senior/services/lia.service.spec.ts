import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { LiaService, spokenMedication, spokenTime } from './lia.service';
import { SeniorStateService } from './senior-state.service';

describe('LiaService intents', () => {
  let lia: LiaService;
  beforeEach(() => { TestBed.configureTestingModule({}); lia = TestBed.inject(LiaService); });

  // Texto escrito y texto tal como lo devuelve Vosk (minusculas, sin tildes ni signos).
  it.each([
    ['¿Qué medicamento me toca?', 'NEXT_MEDICATION'],
    ['que medicamento me toca', 'NEXT_MEDICATION'],
    ['Ya me tomé mi medicamento', 'MEDICATION_TAKEN'],
    ['ya me tome mi medicamento', 'MEDICATION_TAKEN'],
    ['Necesito ayuda', 'START_EMERGENCY'],
    ['Quiero hablar con mi hija', 'CALL_FAMILY'],
    ['Muéstrame mi ubicación', 'OPEN_LOCATION'],
    ['muestrame mi ubicacion', 'OPEN_LOCATION'],
    ['quiero hacer mi check in', 'START_CHECKIN'],
    ['¿Cuándo depositan mi pensión?', 'PENSION_INFO'],
    ['hola buenos días', 'UNKNOWN'],
  ])('%s -> %s', (text, intent) => {
    expect(lia.resolveIntent(text)).toBe(intent);
  });
});

describe('LiaService speech', () => {
  let lia: LiaService;
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); TestBed.configureTestingModule({}); lia = TestBed.inject(LiaService); });
  afterEach(() => vi.useRealTimers());

  async function reply(text: string) {
    const answer = firstValueFrom(lia.respond(text));
    await vi.advanceTimersByTimeAsync(700);
    return answer;
  }

  it.each([
    ['10:00 AM', 'las 10 de la mañana'],
    ['2:00 PM', 'las 2 de la tarde'],
    ['9:00 PM', 'las 9 de la noche'],
    ['1:30 PM', 'la 1 y 30 de la tarde'],
    ['12:00 PM', 'las 12 del día'],
  ])('spokenTime(%s) -> %s', (time, expected) => {
    expect(spokenTime(time)).toBe(expected);
  });

  it('reads dose units and keeps other doses as written', () => {
    expect(spokenMedication({ name: 'Losartán', dose: '50 mg · Con agua', time: '8:00 AM' })).toBe('Losartán de 50 miligramos a las 8 de la mañana');
    expect(spokenMedication({ name: 'Vitamina D', dose: '1 cápsula', time: '2:00 PM' })).toBe('Vitamina D, 1 cápsula, a las 2 de la tarde');
  });

  it('reads the next medication from the state, not a fixed text', async () => {
    const question = ' ¿Quieres que marque la toma como realizada cuando lo tomes?';
    expect((await reply('¿Qué medicamento me toca?')).speech).toBe(`Tu próximo medicamento es Metformina de 500 miligramos a las 10 de la mañana.${question}`);
    TestBed.inject(SeniorStateService).takeMedication('med-metformin');
    expect((await reply('¿Qué medicamento me toca?')).speech).toBe(`Tu próximo medicamento es Vitamina D de 1 cápsula a las 2 de la tarde.${question}`);
  });

  it.each([
    ['Quiero hacer mi check-in', 'Claro. Vamos a registrar cómo te sientes.', '/senior/wellbeing/checkin'],
    ['Quiero registrar cómo me siento', 'Claro. Vamos a registrar cómo te sientes.', '/senior/wellbeing/checkin'],
    ['Quiero llamar a mi familia', 'Claro. Te mostraré tus contactos.', '/senior/family'],
    ['Quiero hacer un ejercicio de memoria', 'Muy bien. Te mostraré los ejercicios disponibles.', '/senior/self-care'],
    ['Dame información de mi pensión', 'Claro. Abriré la información de pensiones y trámites.', '/senior/pensions'],
    ['Muéstrame mi ubicación', 'Estoy buscando tu ubicación.', '/senior/location'],
  ])('"%s" is spoken and opens an existing screen', async (text, speech, route) => {
    const answer = await reply(text);
    expect(answer.speech).toBe(speech);
    expect(answer.opens?.route).toBe(route);
  });

  it('the location screen is asked to search and an emergency never opens on its own', async () => {
    expect((await reply('Muéstrame mi ubicación')).opens?.queryParams).toHaveProperty('solicitar');
    const help = await reply('Necesito ayuda');
    expect(help.speech).toBe('Te escuché. Estoy contigo. ¿Quieres que active la solicitud de ayuda y contacte a tu familiar de emergencia?');
    expect(help.opens).toBeUndefined();
    expect(help.action?.emergency).toBe(true);
  });
});

describe('LiaService language of the reply', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); TestBed.configureTestingModule({}); });
  afterEach(() => vi.useRealTimers());

  async function answer(reply$: ReturnType<LiaService['respond']>) {
    const value = firstValueFrom(reply$);
    await vi.advanceTimersByTimeAsync(700);
    return value;
  }

  it('fills the pilot templates with the real medication, dose and time (nothing hardcoded)', async () => {
    const lia = TestBed.inject(LiaService);
    const state = TestBed.inject(SeniorStateService);
    const next = state.nextMedication()!;
    const doseOf = (dose: string) => dose.split('·')[0].trim();
    const nahuatl = await answer(lia.respondToIntent('NEXT_MEDICATION', 'nahuatl-pilot'));
    expect(nahuatl.message).toMatchObject({ variant: 'nahuatl-pilot', available: true, nativeValidation: false });
    // Un dato que ya termina en punto ("10:00 a.m.") no duplica el punto final de la plantilla.
    expect(nahuatl.text).toBe(`Nopa seyok pajtli tlen tijselis eli ${doseOf(next.dose)} ${next.name} ipan ${next.time}. ¿Tijneki ma nijtlalili se marca kej tijpixtok kema tijkuis?`.replace('..', '.'));
    expect(nahuatl.text).not.toMatch(/\{\w+\}/);
    // Al cambiar el dato, cambia la respuesta: no hay valores fijos.
    state.takeMedication(next.id);
    const following = state.nextMedication()!;
    const zapotec = await answer(lia.respondToIntent('NEXT_MEDICATION', 'zapoteco-pilot'));
    expect(zapotec.text).toContain(`nga ${doseOf(following.dose)} de ${following.name} ${following.time}`);
    expect(zapotec.text).not.toContain(next.name);
  });

  it('names the real daughter in every language and offers the call confirmation', async () => {
    const lia = TestBed.inject(LiaService);
    for (const variant of ['es', 'nahuatl-pilot', 'zapoteco-pilot'] as const) {
      const reply = await answer(lia.respondToIntent('CALL_DAUGHTER', variant));
      expect(reply.text).toContain('Ana Hernández');
      expect(reply.text).not.toContain('{contactName}');
      expect(reply.action).toMatchObject({ label: 'Llamar a Ana', callContactId: expect.any(String) });
    }
  });

  it('answers in the language of the input; Spanish typed in a pilot conversation gets a Spanish reply', () => {
    const lia = TestBed.inject(LiaService);
    expect(lia.resolve('LIA, xijnotza noichpoca.', 'nahuatl-pilot')).toMatchObject({ intent: 'CALL_DAUGHTER', variant: 'nahuatl-pilot' });
    expect(lia.resolve('LIA, caquiiñeʼ gacanécabe naa.', 'zapoteco-pilot')).toMatchObject({ intent: 'START_EMERGENCY', variant: 'zapoteco-pilot' });
    expect(lia.resolve('¿Qué medicamento me toca?', 'zapoteco-pilot')).toMatchObject({ intent: 'NEXT_MEDICATION', variant: 'es' });
  });

  it('an unrecognised pilot phrase gets the Spanish notice and no action', async () => {
    const lia = TestBed.inject(LiaService);
    const reply = await answer(lia.respond('tlen onkak ipan kalli', 'nahuatl-pilot'));
    expect(reply.intent).toBe('UNKNOWN');
    expect(reply.text).toBe('No pude reconocer ese comando. Puedes repetirlo o usar español.');
    expect(reply.message.available).toBe(false);
    expect(reply.action).toBeUndefined();
    expect(reply.opens).toBeUndefined();
  });

  it('the family reply names the real primary contact instead of a hardcoded name', async () => {
    const lia = TestBed.inject(LiaService);
    expect((await answer(lia.respond('Quiero llamar a mi familia'))).text).toBe('Ana Hernández aparece disponible. Puedo llevarte a Familia para llamarla o enviarle un mensaje simulado.');
  });
});

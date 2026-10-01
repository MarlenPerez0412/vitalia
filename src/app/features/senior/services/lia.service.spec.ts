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
  beforeEach(() => { vi.useFakeTimers(); TestBed.configureTestingModule({}); lia = TestBed.inject(LiaService); });
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
    expect((await reply('¿Qué medicamento me toca?')).speech).toBe('Tu próximo medicamento es Metformina de 500 miligramos a las 10 de la mañana.');
    TestBed.inject(SeniorStateService).takeMedication('med-metformin');
    expect((await reply('¿Qué medicamento me toca?')).speech).toBe('Tu próximo medicamento es Vitamina D, 1 cápsula, a las 2 de la tarde.');
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
    expect(help.speech).toMatch(/^Te escuché\. Voy a ayudarte\. ¿Quieres activar la solicitud de ayuda\?/);
    expect(help.opens).toBeUndefined();
    expect(help.action?.emergency).toBe(true);
  });
});

import { parseGlobalVoiceCommand } from './global-voice-command.parser';

describe('parseGlobalVoiceCommand', () => {
  // Frases del requisito y transcripciones reales de Vosk (minusculas, sin signos, "lia"/"lía").
  it.each([
    ['LIA necesito ayuda', 'EMERGENCY_HELP'],
    ['lia necesito ayuda', 'EMERGENCY_HELP'],
    ['LIA me siento mal', 'EMERGENCY_SICK'],
    ['lia, me siento mal', 'EMERGENCY_SICK'],
    ['Lía me siento mal', 'EMERGENCY_SICK'],
    ['lia no me siento bien', 'EMERGENCY_SICK'],
    ['LIA me caí', 'EMERGENCY_FALL'],
    ['lia me caí', 'EMERGENCY_FALL'],
    ['LIA llama a mi hija', 'CALL_DAUGHTER'],
    ['LIA llama a mi contacto de emergencia', 'CALL_PRIMARY_CONTACT'],
    ['LIA abre emergencia', 'OPEN_EMERGENCY'],
    ['lia habrá emergencia', 'OPEN_EMERGENCY'],
    ['lia llévame a emergencias', 'OPEN_EMERGENCY'],
    ['LIA dónde estoy', 'OPEN_LOCATION'],
    ['lia dónde estoy', 'OPEN_LOCATION'],
    ['LIA qué medicamento me toca', 'NEXT_MEDICATION'],
    ['lía que medicamento me toca', 'NEXT_MEDICATION'],
    ['oye lia necesito ayuda', 'EMERGENCY_HELP'],
    ['lia cancelar', 'CANCEL'],
    ['lia sí', 'CONFIRM'],
    ['lia cuéntame un chiste', 'UNKNOWN'],
  ])('%s -> %s', (text, intent) => {
    expect(parseGlobalVoiceCommand(text)?.intent).toBe(intent);
  });

  it('ignores speech that is not addressed to LIA', () => {
    expect(parseGlobalVoiceCommand('hoy hace buen día para salir')).toBeNull();
    expect(parseGlobalVoiceCommand('necesito ayuda con la tele')).toBeNull();
    expect(parseGlobalVoiceCommand('mi tía me llama mañana')).toBeNull();
    expect(parseGlobalVoiceCommand('')).toBeNull();
  });

  it('accepts short answers without LIA only while a question is pending', () => {
    expect(parseGlobalVoiceCommand('sí')).toBeNull();
    expect(parseGlobalVoiceCommand('sí', { awaitingAnswer: true })).toMatchObject({ intent: 'CONFIRM', wakeWord: false });
    expect(parseGlobalVoiceCommand('cancelar', { awaitingAnswer: true })?.intent).toBe('CANCEL');
    expect(parseGlobalVoiceCommand('solicitar ayuda', { awaitingAnswer: true })?.intent).toBe('CONFIRM');
    expect(parseGlobalVoiceCommand('qué rico café', { awaitingAnswer: true })).toBeNull();
  });
});

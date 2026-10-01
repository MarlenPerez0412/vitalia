import { InjectionToken } from '@angular/core';
import esMX from './catalogs/es-MX.json';
import { LiaLanguageCode, SpanishCatalog } from './language.models';

/**
 * Mensajes generales de LIA en español. Las frases de las intenciones multilingües (respuesta y confirmación en
 * español, náhuatl y zapoteco) viven en `lia-multilingual-intents.ts`; lo que un idioma no tenga se muestra en español.
 */
export const SPANISH_MESSAGES = new InjectionToken<SpanishCatalog>('SPANISH_MESSAGES', {
  providedIn: 'root',
  factory: () => esMX as SpanishCatalog,
});

/** Mensajes generales traducidos para las respuestas de voz de las variantes indígenas. */
export const PILOT_MESSAGES: Readonly<Record<Exclude<LiaLanguageCode, 'es'>, Readonly<Record<string, string>>>> = {
  'zapoteco-pilot': {
    'voice.fall.speech': 'Binadiaʼgaʼ lii, ñee racaláʼdxiluʼ gucaaʼ ridxi para gacaneluʼ naa la?',
    'voice.sick.feedback': 'Binadiaʼgaʼ lii, ñee racaláʼdxiluʼ guinabaʼ lii gacaneluʼ naa la?',
    'voice.sick.speech': 'Binadiaʼgaʼ lii, ñee racaláʼdxiluʼ guinabaʼ lii gacaneluʼ naa la?',
    'reply.location.speech': 'Cayuyubeʼ ra nuuluʼ.',
    'reply.checkin.speech': 'Guizáʼ galán modo cayuni sentirluʼ.',
    'voice.emergencyOpened.speech': 'Zuzuluáʼ pantalla de emergencia.',
    'voice.primary.found': 'Bidxelaʼ contactu stiluʼ de emergencia, ¿ñee racaláʼdxiluʼ guxheleʼ marcador ca la?',
    'voice.cancel.speech': 'Galán. Maʼ bicueezaʼ acción ca.',
    'voice.confirm.ok': 'Galán. Maʼ guca confirmar acción que.',
    'reply.medicationTaken.speech': 'Galán. Maʼ bicaaʼ lu registru que gucuaaluʼ medicina stiluʼ.',
  },
  'nahuatl-pilot': {
    'voice.fall.speech': 'Nimitzcactoc, ¿tijnequi ma nimitznotza ma mitzpalehuica?',
    'voice.sick.feedback': 'Nimitzcactoc, ¿tijnequi ma nimitzpalehui?',
    'voice.sick.speech': 'Nimitzcactoc, ¿tijnequi ma nimitzpalehui?',
    'reply.location.speech': 'Nijtemoua kanke ti itstok.',
    'reply.checkin.speech': 'Ma tikijkuilokaj kenijkatsa timomachilia.',
    'voice.emergencyOpened.speech': 'Nijtlapos nopa pantalla tlen emergencia.',
    'voice.primary.found': 'Nijpantik mo contacto tlen emergencia. ¿Tijneki ma nijtlapo nopa marcador?',
    'voice.cancel.speech': 'Kuali kajki. Ya nijtlamiltijtok nopa tekitl.',
    'voice.confirm.ok': 'Kuali kajki. Ya mosentlalijtok tlen tijchijki.',
    'reply.medicationTaken.speech': 'Kuali kajki. Nikijkuilok tlen tijkuik nopa pajtli.',
  },
};

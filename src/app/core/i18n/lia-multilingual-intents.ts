import { InjectionToken } from '@angular/core';
import { LiaLanguageCode, MultilingualIntent } from './language.models';

export interface MultilingualIntentEntry {
  /** Frase de referencia que la persona dice o escribe. */
  canonicalInput: string;
  /** Otras formas aceptadas de decir lo mismo. */
  aliases: readonly string[];
  /** Respuesta de LIA; los huecos ({medication}, {dose}, {time}, {contactName}) se llenan con datos reales. */
  responseTemplate: string;
  /** Lo que LIA dice cuando la persona confirma; null = se usa el español. */
  confirmationTemplate: string | null;
  /**
   * Transcripciones aproximadas que produce Vosk ESPAÑOL al oír la frase canónica (sin "LIA").
   * Calibradas con voz sintética es-MX (SAPI Sabina, dos velocidades) contra el modelo vosk-model-es-0.42;
   * con personas reales pueden variar mucho.
   */
  voskVariants: readonly string[];
}

export interface LanguageIntentCatalog {
  language: LiaLanguageCode;
  variantStatus: 'stable' | 'pilot';
  /** Ninguna frase piloto fue validada por hablantes nativos. */
  nativeValidation: boolean;
  /** De dónde vienen las frases (para la documentación y la validación futura). */
  source: string;
  intents: Readonly<Record<MultilingualIntent, MultilingualIntentEntry>>;
  /** Audios pregrabados y validados por clave de frase, servidos desde public/audio/<código>/ (hoy ninguno). */
  recordedAudio: Readonly<Record<string, string>>;
}

/** Confianza mínima para ejecutar una intención. HELP es más estricta: nunca se activa una emergencia por aproximación. */
export const INTENT_MIN_CONFIDENCE: Readonly<Record<MultilingualIntent, number>> = {
  NEXT_MEDICATION: 0.75,
  CALL_DAUGHTER: 0.75,
  HELP: 0.9,
};

/**
 * Catálogo multilingüe central de LIA: las MISMAS intenciones en cada idioma; solo cambian la entrada y la salida.
 * La lógica de dominio (medicamentos, emergencia, contactos) es única y vive en los servicios existentes.
 * Náhuatl y zapoteco son PILOTO: frases predeterminadas para el MVP proporcionadas por el equipo, sin validación
 * nativa; no cubren el idioma completo.
 */
export const LIA_MULTILINGUAL_INTENTS: Readonly<Record<LiaLanguageCode, LanguageIntentCatalog>> = {
  es: {
    language: 'es',
    variantStatus: 'stable',
    nativeValidation: true,
    source: 'Textos de VITALIA en español (México).',
    recordedAudio: {},
    intents: {
      NEXT_MEDICATION: {
        canonicalInput: 'LIA, ¿qué medicación estoy tomando?',
        aliases: ['¿qué medicamento me toca?', '¿qué medicina debo tomar?', '¿qué pastilla me toca?', 'muéstrame mis medicamentos'],
        responseTemplate: 'Tu próximo medicamento es {medication} de {dose} a las {time}. ¿Quieres que marque la toma como realizada cuando lo tomes?',
        confirmationTemplate: 'De acuerdo. Cuando lo tomes, pulsa «Ya la tomé» y quedará registrado.',
        voskVariants: ['que medicacion estoy tomando'],
      },
      HELP: {
        canonicalInput: 'LIA, necesito ayuda.',
        aliases: ['ayúdame', 'auxilio', 'socorro'],
        responseTemplate: 'Te escuché. Estoy contigo. ¿Quieres que active la solicitud de ayuda y contacte a tu familiar de emergencia?',
        confirmationTemplate: 'De acuerdo. Voy a iniciar la solicitud de ayuda.',
        voskVariants: ['necesito ayuda'],
      },
      CALL_DAUGHTER: {
        canonicalInput: 'LIA, llama a mi hija.',
        aliases: ['llámale a mi hija', 'marca a mi hija', 'comunícame con mi hija'],
        responseTemplate: 'Encontré a {contactName}. ¿Quieres que abra el marcador para llamarla?',
        confirmationTemplate: 'De acuerdo. Para abrir el marcador, pulsa Llamar a {firstName}.',
        voskVariants: ['llama a mi hija'],
      },
    },
  },
  'nahuatl-pilot': {
    language: 'nahuatl-pilot',
    variantStatus: 'pilot',
    nativeValidation: false,
    source: 'Frases predeterminadas del MVP proporcionadas por el equipo de VITALIA (2026-10-01). Variante dialectal por confirmar.',
    recordedAudio: {},
    intents: {
      NEXT_MEDICATION: {
        canonicalInput: 'LIA, tlachke pajtli nijtekiuia?',
        aliases: [],
        responseTemplate: 'Nopa seyok pajtli tlen tijselis eli {dose} {medication} ipan {time}. ¿Tijneki ma nijtlalili se marca kej tijpixtok kema tijkuis?',
        confirmationTemplate: null,
        voskVariants: ['tlaquepaque glynnis de kiwi', 'tlaquepaque clinic the kid huya'],
      },
      HELP: {
        canonicalInput: 'LIA, moneki nechpaleuisej.',
        aliases: [],
        responseTemplate: 'Nimitzcaqui. Na niitztoc mohuaya. ¿Tijneki ma nijchiua nopa tlajtlanili tlen tlapaleuilistli uan ma nijnojnotsa nopa maseuali tlen ika timopaleuis?',
        confirmationTemplate: 'Kuali kajki. Ya mosentlalijtok tlen tijchijki.',
        voskVariants: ['monet kenneth pa lewis edge', 'monet kinect vale woyzeck'],
      },
      CALL_DAUGHTER: {
        canonicalInput: 'LIA, xijnotza noichpoca.',
        aliases: [],
        responseTemplate: 'Nijpantik {contactName}. ¿Tijneki ma nijtlapo nopa amatl uan ma nijnojnotsa?',
        confirmationTemplate: null,
        voskVariants: ['sydney shannon spoke', 'shinnok sano de dicha boca'],
      },
    },
  },
  'zapoteco-pilot': {
    language: 'zapoteco-pilot',
    variantStatus: 'pilot',
    nativeValidation: false,
    source: 'Frases predeterminadas del MVP proporcionadas por el equipo de VITALIA (2026-10-01). Variante dialectal por confirmar.',
    recordedAudio: {},
    intents: {
      NEXT_MEDICATION: {
        canonicalInput: 'LIA, xi medicina naquiiñeʼ guicaaʼ yaʼ.',
        aliases: [],
        responseTemplate: 'Sti medicina ni chigudiicabe lii nga {dose} de {medication} {time}. Ñee racaláʼdxiluʼ gucaaʼ marca luni casi ora guicaaluʼ ni la?',
        confirmationTemplate: null,
        voskVariants: ['once medicina anakin y eggy calla', 'once medicina anakin iñaki calla'],
      },
      HELP: {
        canonicalInput: 'LIA, caquiiñeʼ gacanécabe naa.',
        aliases: [],
        responseTemplate: 'Rucaadiagaʼ lii. Naa nuaa né lii. Pa racaláʼdxiluʼ guneʼ activar solicitud de ayuda ne guiníʼneluʼ contactu stiluʼ de emergencia la?',
        confirmationTemplate: 'Galán. Maʼ guca confirmar acción que.',
        voskVariants: ['que aqui llega caneca ve nada'],
      },
      CALL_DAUGHTER: {
        canonicalInput: 'LIA, bicaa ridxi xiiñidxaapaʼ.',
        aliases: [],
        responseTemplate: 'Bidxelaʼ {contactName}. Pa racaláʼdxiluʼ guxheleʼ archivu ca para guiniéʼ ra nuube la?',
        confirmationTemplate: null,
        voskVariants: ['by carri city nyc chapa', 'by carrie city ni chapa'],
      },
    },
  },
};

/** Catálogo inyectable (las pruebas pueden quitar cadenas para comprobar el respaldo en español). */
export const LIA_INTENT_CATALOGS = new InjectionToken<Readonly<Record<LiaLanguageCode, LanguageIntentCatalog>>>('LIA_INTENT_CATALOGS', {
  providedIn: 'root',
  factory: () => LIA_MULTILINGUAL_INTENTS,
});

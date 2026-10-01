/** Catálogo local de frases de apoyo. Las traducciones son piloto y requieren validación nativa. */
export type IndigenousLanguage = 'nahuatl' | 'zapoteco';
export type IndigenousPhraseCategory = 'greeting' | 'help' | 'medication' | 'family' | 'confirmation' | 'cancellation' | 'emergency' | 'location' | 'checkin';

export interface IndigenousPhrase {
  readonly id: string;
  readonly category: IndigenousPhraseCategory;
  readonly spanish: string;
  readonly nahuatl: { readonly text: string; readonly translation: string };
  readonly zapoteco: { readonly text: string; readonly translation: string };
  /** Ruta de un audio validado, cuando exista. No se usa la voz española como sustituto. */
  readonly audio: { readonly nahuatl: string | null; readonly zapoteco: string | null };
}

export const INDIGENOUS_PHRASES: readonly IndigenousPhrase[] = [
  {
    id: 'buenos-dias', category: 'greeting',
    spanish: 'Buenos días',
    nahuatl: { text: 'Cualli tonatiuh', translation: 'Buenos días' },
    zapoteco: { text: "Bidxi sti'", translation: 'Buenos días' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'como-estas', category: 'greeting',
    spanish: '¿Cómo estás?',
    nahuatl: { text: '¿Quenamis timoyollia?', translation: '¿Cómo estás?' },
    zapoteco: { text: '¿Bixhoze?', translation: '¿Cómo estás?' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'muchas-gracias', category: 'greeting',
    spanish: 'Muchas gracias',
    nahuatl: { text: 'Miac tlazcamati', translation: 'Muchas gracias' },
    zapoteco: { text: 'Bitoope', translation: 'Muchas gracias' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'necesito-ayuda', category: 'help',
    spanish: 'Necesito ayuda',
    nahuatl: { text: 'Moneki nechpaleuisej', translation: 'Necesito ayuda' },
    zapoteco: { text: "Caquiiñeʼ gacanécabe naa", translation: 'Necesito ayuda' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'medicamento', category: 'medication',
    spanish: '¿Qué medicamento estoy tomando?',
    nahuatl: { text: 'Tlachke pajtli nijtekiuia?', translation: '¿Qué medicamento estoy tomando?' },
    zapoteco: { text: "Xi medicina naquiiñeʼ guicaaʼ yaʼ.", translation: '¿Qué medicamento necesito tomar?' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'llamar-hija', category: 'family',
    spanish: 'Llama a mi hija',
    nahuatl: { text: 'Xijnotza noichpoca.', translation: 'Llama a mi hija' },
    zapoteco: { text: 'Bicaa ridxi xiiñidxaapaʼ.', translation: 'Llama a mi hija' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'confirmar', category: 'confirmation',
    spanish: 'Confirmar',
    nahuatl: { text: 'Kema / nijmati', translation: 'Sí, confirmo, de acuerdo' },
    zapoteco: { text: 'Confirmar / de acuerdo', translation: 'Sí, confirmo, de acuerdo' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'cancelar', category: 'cancellation',
    spanish: 'Cancelar',
    nahuatl: { text: 'Amo / xijtlamilti', translation: 'No, cancelar, detente' },
    zapoteco: { text: 'Coʼ / cancelar / gucueeza', translation: 'No, cancelar, detente' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'caida', category: 'emergency',
    spanish: 'Me caí',
    nahuatl: { text: 'Ni uetsitok.', translation: 'Me caí' },
    zapoteco: { text: 'Maʼ biabaʼ.', translation: 'Me caí' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'malestar', category: 'emergency',
    spanish: 'Me siento mal',
    nahuatl: { text: 'Ax kuali nimomachilia.', translation: 'Me siento mal' },
    zapoteco: { text: 'Qué runeʼ sentir galán', translation: 'Me siento mal' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'ubicacion', category: 'location',
    spanish: '¿Dónde estoy?',
    nahuatl: { text: '¿Kanke niitstok?', translation: '¿Dónde estoy?' },
    zapoteco: { text: 'Paraa nuaaʼ yaʼ', translation: '¿Dónde estoy?' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'medicamento-tomado', category: 'medication',
    spanish: 'Ya tomé mi medicamento',
    nahuatl: { text: 'Ya nijkuik nopa pajtli.', translation: 'Ya tomé mi medicamento' },
    zapoteco: { text: 'Maʼ bidxelaʼ ca medicina stinneʼ.', translation: 'Ya tomé mi medicamento' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'checkin', category: 'checkin',
    spanish: 'Quiero registrar cómo me siento',
    nahuatl: { text: 'Nijneki nikijkuilos kenijkatsa nimomachilia.', translation: 'Quiero registrar cómo me siento' },
    zapoteco: { text: 'Racaladxeʼ gucaaʼ ximodo cayuneʼ sentir.', translation: 'Quiero registrar cómo me siento' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'abrir-emergencias', category: 'emergency',
    spanish: 'Abre emergencias',
    nahuatl: { text: 'Xijtlapo nopa tlapaleuilistli tlen tlaijiyouilistli.', translation: 'Abre emergencias' },
    zapoteco: { text: 'Bixheleʼ ca serviciu de emergencia.', translation: 'Abre emergencias' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'contacto-emergencia', category: 'family',
    spanish: 'Llama a mi contacto de emergencia',
    nahuatl: { text: 'Xijnotza no contacto tlen emergencia.', translation: 'Llama a mi contacto de emergencia' },
    zapoteco: { text: 'Bicaa ridxi contactu stinneʼ de emergencia.', translation: 'Llama a mi contacto de emergencia' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'saludo', category: 'greeting',
    spanish: 'Saludo',
    nahuatl: { text: 'Tlajpaloli.', translation: 'Hola' },
    zapoteco: { text: 'Cadapaʼ diuxi.', translation: 'Hola' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'como-estas-extendido', category: 'greeting',
    spanish: '¿Cómo estás?',
    nahuatl: { text: 'Kejatsa tiʼistok?', translation: '¿Cómo estás?' },
    zapoteco: { text: 'Xi modo nuulu?', translation: '¿Cómo estás?' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'gracias-extendido', category: 'greeting',
    spanish: 'Muchas gracias',
    nahuatl: { text: 'Miyak tlaskamati.', translation: 'Muchas gracias' },
    zapoteco: { text: 'Xquíxepé.', translation: 'Muchas gracias' },
    audio: { nahuatl: null, zapoteco: null },
  },
  {
    id: 'despedida', category: 'greeting',
    spanish: 'Bienvenida y despedida',
    nahuatl: { text: 'Xihualaca huan ximoiyocacahuaca.', translation: 'Bienvenida y despedida' },
    zapoteco: { text: 'Bidxaagalú ne despedida.', translation: 'Bienvenida y despedida' },
    audio: { nahuatl: null, zapoteco: null },
  },
];

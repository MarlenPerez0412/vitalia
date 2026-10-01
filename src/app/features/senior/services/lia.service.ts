import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { normalizeText } from '../../../core/utils/text-normalize';
import { LiaIntent, LiaReply, MedicationDemo } from '../models/senior.models';
import { SeniorStateService } from './senior-state.service';

const SPOKEN_UNITS: Readonly<Record<string, string>> = { mg: 'miligramos', g: 'gramos', mcg: 'microgramos', ml: 'mililitros', ui: 'unidades' };

/** "10:00 AM" -> "las 10 de la mañana"; "2:30 PM" -> "las 2 y 30 de la tarde". */
export function spokenTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return `las ${time}`;
  const hour = Number(match[1]);
  const minutes = Number(match[2]);
  const hour24 = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  const period = hour24 < 12 ? 'de la mañana' : hour24 === 12 ? 'del día' : hour24 < 19 ? 'de la tarde' : 'de la noche';
  return `${hour === 1 ? 'la 1' : `las ${hour}`}${minutes ? ` y ${minutes}` : ''} ${period}`;
}

/** "Metformina", "500 mg · Con alimentos", "10:00 AM" -> "Metformina de 500 miligramos a las 10 de la mañana". */
export function spokenMedication(medication: Pick<MedicationDemo, 'name' | 'dose' | 'time'>): string {
  const dose = medication.dose.split('·')[0].trim();
  const amount = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)$/.exec(dose);
  const unit = amount && SPOKEN_UNITS[amount[2].toLowerCase()];
  const detail = unit ? ` de ${amount![1]} ${unit}` : dose ? `, ${dose},` : '';
  return `${medication.name}${detail} a ${spokenTime(medication.time)}`;
}

/** Orden de evaluacion: las intenciones mas especificas o urgentes primero. */
const INTENT_RULES: readonly (readonly [LiaIntent, RegExp])[] = [
  ['START_EMERGENCY', /\b(ayuda|emergencia|me cai|auxilio|me siento muy mal)\b/],
  ['MEDICATION_TAKEN', /\b(ya )?(me )?(tome|tomado|tomada)\b.*\b(medicamento|medicina|pastilla|pastillas)\b|\bya (me la|lo|la) tome\b/],
  ['OPEN_LOCATION', /\b(ubicacion|donde estoy|mapa)\b/],
  ['CALL_FAMILY', /\b(hija|hijo|ana|familia|llamar|llama)\b/],
  ['START_CHECKIN', /\b(check ?in|como me siento|registrar como estoy|bienestar|mi dia)\b/],
  ['PENSION_INFO', /\b(pension|depositan|deposito)\b/],
  ['MEMORY_ACTIVITY', /\b(memoria|ejercicio|ejercicios)\b/],
  ['NEXT_MEDICATION', /\b(medicamento|medicina|pastilla|me toca)\b/],
];

/**
 * Resuelve la intencion de un texto (escrito o transcrito por Vosk) y genera una respuesta de demostracion.
 * No ejecuta acciones: la pagina decide que hacer con `intent`. `speech` es lo que LIA dice en voz alta y `opens`,
 * la pantalla existente que abre despues; la voz describe solo lo que ocurre de verdad y nunca contiene "LIA".
 * La emergencia nunca se abre sola: requiere pulsar "Solicitar ayuda".
 */
@Injectable({ providedIn: 'root' })
export class LiaService {
  private readonly seniorState = inject(SeniorStateService);

  respond(prompt: string): Observable<LiaReply> {
    return of(this.replyFor(prompt)).pipe(delay(650));
  }

  resolveIntent(prompt: string): LiaIntent {
    const normalized = normalizeText(prompt);
    return INTENT_RULES.find(([, pattern]) => pattern.test(normalized))?.[0] ?? 'UNKNOWN';
  }

  private replyFor(prompt: string): LiaReply {
    const intent = this.resolveIntent(prompt);
    const next = this.seniorState.nextMedication();
    switch (intent) {
      case 'MEDICATION_TAKEN':
        return next
          ? { intent, text: `Listo, registré tu ${next.name} de las ${next.time}. Todo quedó guardado.`, speech: `Perfecto. Registré tu medicamento ${next.name} como tomado.` }
          : { intent, text: 'Ya tienes todos tus medicamentos de hoy registrados.', speech: 'No tienes medicamentos pendientes por registrar.' };
      case 'NEXT_MEDICATION':
        return next
          ? { intent, text: `Te toca ${next.name} de ${next.dose.split('·')[0].trim()} a las ${next.time}. ${next.status === 'PENDING' ? 'Está pendiente.' : 'Aún no es la hora.'}`, speech: `Tu próximo medicamento es ${spokenMedication(next)}.` }
          : { intent, text: 'Ya tomaste todos tus medicamentos de hoy. ¡Muy bien!', speech: 'No tienes medicamentos pendientes en este momento.' };
      case 'START_EMERGENCY':
        return { intent, text: 'Estoy contigo. Si es una emergencia, puedo iniciar la solicitud de ayuda; tendrás unos segundos para cancelar.', action: { label: 'Solicitar ayuda', route: '/senior/emergency', emergency: true },
          speech: 'Te escuché. Voy a ayudarte. ¿Quieres activar la solicitud de ayuda? Para hacerlo, pulsa el botón de solicitar ayuda en la pantalla.' };
      case 'CALL_FAMILY':
        return { intent, text: 'Ana Hernández aparece disponible. Puedo llevarte a Familia para llamarla o enviarle un mensaje simulado.', action: { label: 'Abrir Familia', route: '/senior/family' },
          speech: 'Claro. Te mostraré tus contactos.', opens: { route: '/senior/family' } };
      case 'OPEN_LOCATION':
        // `solicitar`: la pantalla de Ubicacion consulta el GPS al abrirse y dice el resultado.
        return { intent, text: 'Puedo mostrarte tu ubicación en el mapa. Solo se consulta si tú lo pides.', action: { label: 'Ver mi ubicación', route: '/senior/location' },
          speech: 'Estoy buscando tu ubicación.', opens: { route: '/senior/location', queryParams: { solicitar: Date.now() } } };
      case 'START_CHECKIN':
        return { intent, text: 'Hagamos tu check-in diario. Son unas preguntas breves sobre cómo te sientes.', action: { label: 'Iniciar check-in', route: '/senior/wellbeing/checkin' },
          speech: 'Claro. Vamos a registrar cómo te sientes.', opens: { route: '/senior/wellbeing/checkin' } };
      case 'PENSION_INFO':
        return { intent, text: 'El calendario de demostración muestra el próximo periodo en noviembre–diciembre. Esta información aún no está conectada a una institución.',
          speech: 'Claro. Abriré la información de pensiones y trámites.', opens: { route: '/senior/pensions' } };
      case 'MEMORY_ACTIVITY':
        return { intent, text: 'Encontré una actividad breve de memoria. Puedes abrirla cuando quieras.', action: { label: 'Abrir actividad', route: '/senior/self-care/memory-demo' },
          speech: 'Muy bien. Te mostraré los ejercicios disponibles.', opens: { route: '/senior/self-care' } };
      default:
        return { intent, text: 'Entendí tu mensaje. En esta demostración puedo ayudarte con medicamentos, bienestar, familia, ubicación, pensiones y actividades de memoria.' };
    }
  }
}

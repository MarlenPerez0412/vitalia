import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { LanguageContextService } from '../../../core/i18n/language-context.service';
import { LocalizedText, PhraseKey, VariantId } from '../../../core/i18n/language.models';
import { intentKey, PhraseParams, PhrasebookService } from '../../../core/i18n/phrasebook.service';
import { LiaAction, LiaIntent, LiaNavigation, LiaReply } from '../models/senior.models';
import { ContactsService } from './contacts.service';
import { IntentLexiconService, LexiconMatch } from './intent-lexicon';
import { SeniorStateService } from './senior-state.service';

// El formateo en espanol vive en la capa de idiomas; se re-exporta para los consumidores existentes.
export { spokenMedication, spokenTime } from '../../../core/i18n/formatters/es-mx.formatters';

export interface LiaResolution {
  intent: LiaIntent;
  /** Idioma en que se reconocio la entrada: la respuesta sale en el mismo. */
  variant: VariantId;
  confidence: number | null;
  matchedBy: LexiconMatch<LiaIntent>['matchedBy'] | null;
}

/**
 * Resuelve la intencion de un texto (escrito o transcrito) y genera la respuesta en la lengua de la entrada.
 * Las intenciones y los datos (medicamentos, contactos) son los mismos para todos los idiomas: solo cambian las
 * frases. No ejecuta acciones: la pagina decide que hacer con `intent`. `speech` es lo que LIA dice en voz alta y
 * `opens`, la pantalla existente que abre despues; la voz describe solo lo que ocurre de verdad y nunca contiene
 * "LIA". La emergencia nunca se abre sola: requiere pulsar "Solicitar ayuda".
 */
@Injectable({ providedIn: 'root' })
export class LiaService {
  private readonly seniorState = inject(SeniorStateService);
  private readonly contacts = inject(ContactsService);
  private readonly phrases = inject(PhrasebookService);
  private readonly lexicons = inject(IntentLexiconService);
  private readonly language = inject(LanguageContextService);

  respond(prompt: string, variant: VariantId = this.language.interactionVariant()): Observable<LiaReply> {
    const resolution = this.resolve(prompt, variant);
    return this.respondToIntent(resolution.intent, resolution.variant);
  }

  /** Respuesta a una intencion ya resuelta (p. ej. una pregunta sugerida o un comando global), en el idioma indicado. */
  respondToIntent(intent: LiaIntent, variant: VariantId = this.language.interactionVariant()): Observable<LiaReply> {
    return of(this.replyFor(intent, variant)).pipe(delay(650));
  }

  /** Prueba el lexico del idioma y, si es un piloto, tambien el espanol; sin coincidencia segura, UNKNOWN. */
  resolve(prompt: string, variant: VariantId = this.language.interactionVariant()): LiaResolution {
    for (const lexicon of this.lexicons.chainFor(variant)) {
      const match = lexicon.liaIntent(prompt);
      if (match) return { intent: match.intent, variant: lexicon.variant, confidence: match.confidence, matchedBy: match.matchedBy };
    }
    return { intent: 'UNKNOWN', variant, confidence: null, matchedBy: null };
  }

  resolveIntent(prompt: string, variant: VariantId = 'es'): LiaIntent {
    return this.resolve(prompt, variant).intent;
  }

  private replyFor(intent: LiaIntent, variant: VariantId): LiaReply {
    const next = this.seniorState.nextMedication();
    const t = (key: PhraseKey, params?: PhraseParams, mode: 'text' | 'speech' = 'text') => this.phrases.t(key, params, variant, mode);
    const reply = (message: LocalizedText, spoken?: LocalizedText, extra: { action?: LiaAction; opens?: LiaNavigation } = {}): LiaReply => ({
      intent,
      text: message.text,
      ...(spoken ? { speech: spoken.text, spoken } : {}),
      message,
      ...extra,
    });
    switch (intent) {
      case 'MEDICATION_TAKEN':
        return next
          ? reply(t('reply.medicationTaken.text', { medication: next.name, time: next.time }), t('reply.medicationTaken.speech', { medication: next.name }))
          : reply(t('reply.medicationTaken.none'), t('medication.nothingToRecord'));
      case 'NEXT_MEDICATION': {
        if (!next) return reply(t('reply.nextMedication.none.text'), t('reply.nextMedication.none.speech'));
        const params: PhraseParams = { medication: next.name, dose: { dose: next.dose }, time: { time: next.time } };
        return reply(t(intentKey('NEXT_MEDICATION', 'response'), params), t(intentKey('NEXT_MEDICATION', 'response'), params, 'speech'));
      }
      case 'START_EMERGENCY': {
        const help = t(intentKey('HELP', 'response'));
        return reply(help, help, { action: { label: 'Solicitar ayuda', route: '/senior/emergency', emergency: true } });
      }
      case 'CALL_DAUGHTER': {
        const daughter = this.contacts.findByRelationship('hija');
        if (!daughter) return reply(t('voice.daughter.missing'));
        const found = t(intentKey('CALL_DAUGHTER', 'response'), { contactName: daughter.name });
        return reply(found, found, { action: { label: `Llamar a ${daughter.name.split(/\s+/)[0]}`, route: '/senior/family', callContactId: daughter.id } });
      }
      case 'CALL_FAMILY':
        return reply(t('reply.family.text', { contact: this.contacts.primaryEmergencyContact()?.name ?? 'Tu familia' }), t('reply.family.speech'),
          { action: { label: 'Abrir Familia', route: '/senior/family' }, opens: { route: '/senior/family' } });
      case 'OPEN_LOCATION':
        // `solicitar`: la pantalla de Ubicacion consulta el GPS al abrirse y dice el resultado.
        return reply(t('reply.location.text'), t('reply.location.speech'),
          { action: { label: 'Ver mi ubicación', route: '/senior/location' }, opens: { route: '/senior/location', queryParams: { solicitar: Date.now() } } });
      case 'START_CHECKIN':
        return reply(t('reply.checkin.text'), t('reply.checkin.speech'),
          { action: { label: 'Iniciar check-in', route: '/senior/wellbeing/checkin' }, opens: { route: '/senior/wellbeing/checkin' } });
      case 'PENSION_INFO':
        return reply(t('reply.pension.text'), t('reply.pension.speech'), { opens: { route: '/senior/pensions' } });
      case 'MEMORY_ACTIVITY':
        return reply(t('reply.memory.text'), t('reply.memory.speech'),
          { action: { label: 'Abrir actividad', route: '/senior/self-care/memory-demo' }, opens: { route: '/senior/self-care' } });
      default:
        // En un idioma piloto, lo que no se reconoce se responde en espanol (marcado como respaldo) y sin accion.
        return reply(t(variant === 'es' ? 'reply.unknown.text' : 'voice.pilotNotRecognized'));
    }
  }
}

import { inject, Injectable } from '@angular/core';
import { ES_MX_FORMATTER, PhraseFormatter, PhraseMode, PILOT_FORMATTER } from './formatters/es-mx.formatters';
import { PILOT_MESSAGES, SPANISH_MESSAGES } from './language-catalogs';
import { LanguageContextService } from './language-context.service';
import { IntentMessageKey, LocalizedText, MessageKey, MultilingualIntent, PhraseKey, VariantId } from './language.models';
import { LIA_INTENT_CATALOGS } from './lia-multilingual-intents';

/** Valor de una plantilla: texto, o un dato que cada idioma formatea a su manera (dosis, hora). */
export type PhraseParam = string | number | { dose: string } | { time: string };
export type PhraseParams = Readonly<Record<string, PhraseParam>>;

const INTENT_KEY = /^intent\.(NEXT_MEDICATION|HELP|CALL_DAUGHTER)\.(response|confirmation)$/;

/**
 * Plantillas de LIA por idioma. La lógica pide una clave con datos reales y recibe el texto en el idioma pedido;
 * si ese idioma no tiene la cadena, devuelve el español marcado como respaldo (`available: false`).
 * Nunca traduce automáticamente.
 */
@Injectable({ providedIn: 'root' })
export class PhrasebookService {
  private readonly spanish = inject(SPANISH_MESSAGES);
  private readonly intents = inject(LIA_INTENT_CATALOGS);
  private readonly context = inject(LanguageContextService);

  t(key: PhraseKey, params: PhraseParams = {}, variant: VariantId = this.context.interactionVariant(), mode: PhraseMode = 'text'): LocalizedText {
    const spanish = this.render(this.template(key, 'es')!, params, ES_MX_FORMATTER, mode);
    const template = variant === 'es' ? null : this.template(key, variant);
    if (variant === 'es') return { key, variant, text: spanish, available: true, fallbackText: null, nativeValidation: true };
    if (template) {
      return { key, variant, text: this.render(template, params, PILOT_FORMATTER, mode), available: true, fallbackText: null, nativeValidation: this.intents[variant].nativeValidation };
    }
    return { key, variant, text: spanish, available: false, fallbackText: spanish, nativeValidation: this.intents[variant]?.nativeValidation ?? false };
  }

  /** Audio pregrabado y validado para una clave (ruta servida desde public/), o null. Hoy no hay ninguno. */
  recordedAudio(key: PhraseKey, variant: VariantId): string | null {
    const file = variant === 'es' ? null : this.intents[variant]?.recordedAudio[key];
    return file ? `/audio/${variant}/${file}` : null;
  }

  /** Intenciones con frases predeterminadas en el idioma (para mostrar la cobertura del piloto). */
  coverage(variant: VariantId): { intents: readonly MultilingualIntent[]; nativeValidation: boolean } {
    const catalog = this.intents[variant];
    return { intents: catalog ? Object.keys(catalog.intents) as MultilingualIntent[] : [], nativeValidation: catalog?.nativeValidation ?? false };
  }

  private template(key: PhraseKey, variant: VariantId): string | null {
    const intent = INTENT_KEY.exec(key);
    if (intent) {
      const entry = this.intents[variant]?.intents[intent[1] as MultilingualIntent];
      return (intent[2] === 'response' ? entry?.responseTemplate : entry?.confirmationTemplate) ?? null;
    }
    return variant === 'es' ? this.spanish.messages[key as MessageKey] ?? null : PILOT_MESSAGES[variant]?.[key] ?? null;
  }

  private render(template: string, params: PhraseParams, formatter: PhraseFormatter, mode: PhraseMode): string {
    const values: Record<string, string> = {};
    for (const [name, value] of Object.entries(params)) {
      if (typeof value === 'string' || typeof value === 'number') values[name] = String(value);
      else values[name] = 'dose' in value ? formatter.dose(value.dose, mode) : formatter.time(value.time, mode);
    }
    return formatter.finish(interpolate(template, values), mode);
  }
}

/** Clave de la respuesta o confirmación de una intención multilingüe. */
export function intentKey(intent: MultilingualIntent, part: 'response' | 'confirmation'): IntentMessageKey {
  return `intent.${intent}.${part}`;
}

/**
 * Sustituye {nombre}; un hueco sin dato se deja visible para que las pruebas lo detecten. Si un dato termina en
 * abreviatura ("10:00 a.m.") y la plantilla pone punto final, se deja un solo punto.
 */
function interpolate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match).replace(/(?<!\.)\.\.(?!\.)/g, '.');
}

import { computed, Injectable, signal } from '@angular/core';
import { LANGUAGE_SWITCH_CONFIDENCE, LanguageDetection } from './language-detector';
import { LanguageId, LiaLanguageCode } from './language.models';
import { DEFAULT_LIA_LANGUAGE, isLiaLanguage, variantInfo } from './language-variants';

const STORAGE_KEY = 'vitalia.lia-language';

interface StoredLanguage {
  liaLanguage: LiaLanguageCode;
  allowSpanishFallback: boolean;
}

export interface TextInputResolution {
  /** Idioma en el que debe responder LIA. */
  variant: LiaLanguageCode;
  /** La conversación cambió de idioma por una identificación de confianza alta. */
  switched: boolean;
}

/**
 * Estado lingüístico de LIA. `liaLanguage` es la preferencia central ('es' | 'nahuatl-pilot' | 'zapoteco-pilot'),
 * guardada en el dispositivo; la interacción (idioma de la conversación en curso) dura la sesión y empieza igual.
 * La conversación recuerda su idioma: solo cambia por una acción explícita o por una entrada identificada con
 * confianza alta; con confianza baja nunca se cambia.
 */
@Injectable({ providedIn: 'root' })
export class LanguageContextService {
  private readonly stored = this.restore();

  /** Preferencia central de idioma de LIA. */
  readonly liaLanguage = signal<LiaLanguageCode>(this.stored.liaLanguage);
  readonly preferredVariant = this.liaLanguage.asReadonly();
  readonly preferredLanguage = computed<LanguageId>(() => variantInfo(this.liaLanguage()).language);
  readonly interactionVariant = signal<LiaLanguageCode>(this.stored.liaLanguage);
  readonly interactionLanguage = computed<LanguageId>(() => variantInfo(this.interactionVariant()).language);
  readonly lastDetectedLanguage = signal<LiaLanguageCode | null>(null);
  /** Confianza (0–1) de la última identificación de idioma; null si no hubo detección. */
  readonly confidence = signal<number | null>(null);
  /** La persona permite que LIA hable en español cuando falta una cadena en su idioma. */
  readonly allowSpanishFallback = signal(this.stored.allowSpanishFallback);

  /** Cambio de preferencia (Accesibilidad): también fija el idioma de la conversación. */
  setLiaLanguage(language: LiaLanguageCode): void {
    if (!isLiaLanguage(language)) return;
    this.liaLanguage.set(language);
    this.interactionVariant.set(language);
    this.persist();
  }

  setAllowSpanishFallback(allowed: boolean): void {
    this.allowSpanishFallback.set(allowed);
    this.persist();
  }

  /** Cambio explícito del idioma de la conversación (botón o comando); la preferencia guardada no cambia. */
  switchInteraction(language: LiaLanguageCode): void {
    if (isLiaLanguage(language)) this.interactionVariant.set(language);
  }

  recordDetection(language: LiaLanguageCode | null, confidence: number | null): void {
    this.lastDetectedLanguage.set(language);
    this.confidence.set(confidence);
  }

  /**
   * Idioma de la respuesta a un mensaje escrito. Orden: idioma fijado y contexto (el actual), salvo que la detección
   * sea de confianza alta; con confianza baja nunca se cambia.
   */
  resolveTextInput(detection: LanguageDetection): TextInputResolution {
    this.recordDetection(detection.variant, detection.variant ? detection.confidence : null);
    if (!detection.variant || detection.confidence < LANGUAGE_SWITCH_CONFIDENCE || detection.variant === this.interactionVariant()) {
      return { variant: this.interactionVariant(), switched: false };
    }
    this.interactionVariant.set(detection.variant);
    return { variant: detection.variant, switched: true };
  }

  /** Vuelve al idioma preferido (p. ej. al cerrar sesión). */
  resetInteraction(): void {
    this.interactionVariant.set(this.liaLanguage());
    this.recordDetection(null, null);
  }

  private persist(): void {
    const value: StoredLanguage = { liaLanguage: this.liaLanguage(), allowSpanishFallback: this.allowSpanishFallback() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* Sin almacenamiento: vale para esta sesión. */ }
  }

  private restore(): StoredLanguage {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<StoredLanguage> | null;
      if (parsed && isLiaLanguage(parsed.liaLanguage)) return { liaLanguage: parsed.liaLanguage, allowSpanishFallback: parsed.allowSpanishFallback === true };
    } catch { /* Valor corrupto o sin almacenamiento: se usa el español. */ }
    return { liaLanguage: DEFAULT_LIA_LANGUAGE, allowSpanishFallback: false };
  }
}

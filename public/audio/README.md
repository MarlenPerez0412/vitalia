# Audios pregrabados de LIA (idiomas piloto)

Es un respaldo opcional para que LIA diga sus respuestas en un idioma piloto (`nahuatl-pilot`, `zapoteco-pilot`) que todavía no tiene voz nativa. **No hay grabaciones:** por ahora, las respuestas piloto solo se muestran en texto y nunca se leen con la voz española.

- Cada audio se sirve en `/audio/<código>/<archivo>`, por ejemplo `/audio/zapoteco-pilot/help.mp3`.
- La raíz de assets del proyecto es `public/`; `src/assets` no se publica.

## Cómo agregar una grabación
1. Grábala con una persona hablante nativa de la variante, con su consentimiento explícito y por escrito.
2. Pide a otra persona hablante nativa que valide la grabación. Las frases de salud y de emergencia requieren además revisión clínica.
3. Copia el archivo en `public/audio/<código>/`, preferiblemente en MP3 o en WAV de 16 kHz mono.
4. Regístralo en `src/app/core/i18n/lia-multilingual-intents.ts`, dentro del `recordedAudio` del idioma, usando la clave de la frase:
   ```ts
   recordedAudio: { 'intent.HELP.response': 'help.mp3' }
   ```
   `LiaOutputService` la reproduce en la misma cola de voz de LIA y con el mismo bloqueo de micrófono.

## Privacidad
- Nunca se usan audios de personas usuarias de VITALIA ni grabaciones de emergencias reales. VITALIA no guarda audio.
- Las grabaciones contienen solo la frase de LIA, nunca datos personales.

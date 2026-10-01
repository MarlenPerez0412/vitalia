import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ConsentDialogComponent } from '../../../../shared/ui/consent-dialog/consent-dialog.component';
import { CallContactDialogComponent } from '../call-contact-dialog/call-contact-dialog.component';
import { VoiceCommandService } from '../../services/voice-command.service';

/** Dialogos de los comandos de voz. Se renderizan a nivel de layout, fuera de contenedores `sticky`. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CallContactDialogComponent, ConsentDialogComponent],
  selector: 'app-voice-command-dialogs',
  template: `
    <app-consent-dialog [open]="voice.consentOpen()" icon="microphone"
      heading="¿Quieres activar los comandos de voz?"
      description="Mientras VITALIA esté abierto podrás decir ‘LIA’ seguido de una instrucción. El micrófono se utilizará únicamente mientras esta función esté activa."
      note="La voz se detecta en este dispositivo; solo las frases que dices se convierten en texto en el servidor de VITALIA. No guardamos audio ni texto."
      confirmLabel="Activar" dismissLabel="Ahora no"
      (confirmed)="voice.acceptConsent()" (dismissed)="voice.declineConsent()" />

    <app-consent-dialog [open]="sickOpen()" icon="emergency" tone="danger"
      heading="He entendido que te sientes mal."
      description="¿Quieres pedir ayuda? Avisaremos a tu contacto de emergencia (simulado) y, si lo permites, compartiremos tu ubicación."
      note="También puedes decir «Sí» o «Cancelar»."
      confirmLabel="Solicitar ayuda" dismissLabel="Cancelar"
      (confirmed)="voice.confirmSick()" (dismissed)="voice.dismissPrompt()" />

    <app-call-contact-dialog [open]="!!callContact()" [contact]="callContact()" (called)="voice.announceCall($event)" (closed)="voice.dismissPrompt()" />
  `,
  styles: `:host { display: contents; }`,
})
export class VoiceCommandDialogsComponent {
  protected readonly voice = inject(VoiceCommandService);
  protected readonly sickOpen = computed(() => this.voice.prompt()?.kind === 'SICK');
  protected readonly callContact = computed(() => { const prompt = this.voice.prompt(); return prompt?.kind === 'CALL' ? prompt.contact : null; });
}

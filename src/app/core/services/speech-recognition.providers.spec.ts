import { TestBed } from '@angular/core/testing';
import { AudioRecording } from '../models/permission.models';
import { SpeechRecognitionRegistry } from './speech-recognition.providers';
import { VoiceApiService } from './voice-api.service';

const wav: AudioRecording = { blob: new Blob(['wav'], { type: 'audio/wav' }), mimeType: 'audio/wav', durationMs: 900, createdAt: '' };

describe('SpeechRecognition providers', () => {
  const transcribe = vi.fn();

  beforeEach(() => {
    transcribe.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: VoiceApiService, useValue: { transcribe } }] });
  });

  it('Spanish keeps the existing Vosk request unchanged', async () => {
    transcribe.mockResolvedValue('lia que medicamento me toca');
    const provider = TestBed.inject(SpeechRecognitionRegistry).forVariant('es');
    expect(provider.experimental).toBe(false);
    await expect(provider.transcribe(wav)).resolves.toEqual({ text: 'lia que medicamento me toca', variant: 'es', provider: 'vosk', experimental: false });
    expect(transcribe).toHaveBeenCalledExactlyOnceWith(wav);
  });

  it.each(['nahuatl-pilot', 'zapoteco-pilot'] as const)('%s uses the same Spanish Vosk as an experimental fallback (no native ASR)', async (code) => {
    transcribe.mockResolvedValue('lia sydney shannon spoke');
    const provider = TestBed.inject(SpeechRecognitionRegistry).forVariant(code);
    expect(provider.experimental).toBe(true);
    await expect(provider.transcribe(wav)).resolves.toEqual({ text: 'lia sydney shannon spoke', variant: code, provider: 'vosk-fallback', experimental: true });
    expect(transcribe).toHaveBeenCalledExactlyOnceWith(wav);
  });
});

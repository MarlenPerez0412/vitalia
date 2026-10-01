import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AudioRecording } from '../models/permission.models';
import { VoiceApiError, VoiceApiService } from './voice-api.service';

describe('VoiceApiService', () => {
  const recording: AudioRecording = { blob: new Blob(['audio'], { type: 'audio/webm' }), mimeType: 'audio/webm', durationMs: 1200, createdAt: '' };
  let service: VoiceApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(VoiceApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function expectRequest() {
    // La conversion a WAV es asincrona; se espera a que la peticion salga.
    return vi.waitFor(() => http.expectOne('http://localhost:8000/api/voice/transcribe'));
  }

  it('sends the audio as multipart and returns the text', async () => {
    const result = service.transcribe(recording);
    const request = await expectRequest();
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('audio')).toBeInstanceOf(Blob);
    request.flush({ success: true, text: ' ya me tomé mi medicamento ' });
    expect(await result).toBe('ya me tomé mi medicamento');
  });

  it('returns an empty string when nothing was recognized', async () => {
    const result = service.transcribe(recording);
    (await expectRequest()).flush({ success: true, text: '' });
    expect(await result).toBe('');
  });

  it('throws a friendly error when the backend fails or is down', async () => {
    const result = service.transcribe(recording);
    (await expectRequest()).flush({ message: 'x' }, { status: 503, statusText: 'Service Unavailable' });
    await expect(result).rejects.toEqual(expect.objectContaining({ message: 'No pude procesar tu voz. Puedes seguir escribiendo.', status: 503 }));

    const offline = service.transcribe(recording);
    (await expectRequest()).error(new ProgressEvent('error'));
    await expect(offline).rejects.toBeInstanceOf(VoiceApiError);
  });
});

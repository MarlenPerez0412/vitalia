import { TestBed } from '@angular/core/testing';
import { VoiceSessionCoordinatorService } from './voice-session-coordinator.service';

describe('VoiceSessionCoordinatorService', () => {
  let coordinator: VoiceSessionCoordinatorService;
  const pause = vi.fn();
  const resume = vi.fn();

  beforeEach(() => {
    pause.mockReset(); resume.mockReset();
    TestBed.configureTestingModule({});
    coordinator = TestBed.inject(VoiceSessionCoordinatorService);
    coordinator.registerGlobal({ pause, resume });
  });

  it('pauses global commands while LIA listens and resumes them afterwards', () => {
    expect(coordinator.requestGlobal()).toBe(true);
    expect(coordinator.owner()).toBe('GLOBAL');

    coordinator.acquireLia();
    expect(pause).toHaveBeenCalledExactlyOnceWith('LIA');
    expect(coordinator.owner()).toBe('LIA');
    expect(coordinator.globalPaused()).toBe(true);

    coordinator.releaseLia();
    expect(resume).toHaveBeenCalledOnce();
    expect(coordinator.owner()).toBe('IDLE');
  });

  it('never lets global commands take the microphone from LIA', () => {
    coordinator.acquireLia();
    expect(coordinator.requestGlobal()).toBe(false);
    expect(coordinator.owner()).toBe('LIA');
    coordinator.releaseLia();
    expect(resume).toHaveBeenCalledOnce();
  });

  it('does not resume anything if global commands were not active', () => {
    coordinator.acquireLia();
    coordinator.releaseLia();
    expect(pause).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  it('keeps the microphone closed while LIA speaks and resumes global commands afterwards', () => {
    coordinator.requestGlobal();
    coordinator.beginSpeech();
    expect(pause).toHaveBeenCalledWith('SPEECH');
    expect(coordinator.owner()).toBe('IDLE');
    expect(coordinator.requestGlobal()).toBe(false);
    coordinator.endSpeech();
    expect(resume).toHaveBeenCalledOnce();
  });

  it('LIA listening silences the voice, and global commands wait for both to finish', () => {
    const stop = vi.fn(() => coordinator.endSpeech());
    coordinator.registerSpeech({ stop });
    coordinator.requestGlobal();
    coordinator.beginSpeech();
    coordinator.acquireLia();
    expect(stop).toHaveBeenCalledOnce();
    expect(resume).not.toHaveBeenCalled();
    // LIA responde hablando antes de soltar su turno: la escucha global espera al final de la voz.
    coordinator.beginSpeech();
    coordinator.releaseLia();
    expect(resume).not.toHaveBeenCalled();
    coordinator.endSpeech();
    expect(resume).toHaveBeenCalledOnce();
  });
});

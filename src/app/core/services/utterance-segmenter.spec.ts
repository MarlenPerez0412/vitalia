import { downsample, UtteranceSegmenter } from './utterance-segmenter';

const RATE = 16000;
const silence = (ms: number) => new Float32Array(RATE * ms / 1000);
const tone = (ms: number, amplitude = 0.2) => Float32Array.from({ length: RATE * ms / 1000 }, (_, index) => amplitude * Math.sin(index / 5));

describe('UtteranceSegmenter (VAD local)', () => {
  it('never emits anything for silence or background noise', () => {
    const utterances: Float32Array[] = [];
    const segmenter = new UtteranceSegmenter((samples) => utterances.push(samples));
    segmenter.push(silence(3000));
    segmenter.push(tone(3000, 0.004));
    expect(utterances).toHaveLength(0);
  });

  it('emits one utterance per phrase, keeping a short pre-roll', () => {
    const utterances: Float32Array[] = [];
    const segmenter = new UtteranceSegmenter((samples) => utterances.push(samples));
    segmenter.push(silence(1000));
    segmenter.push(tone(1200));
    segmenter.push(silence(1000));
    expect(utterances).toHaveLength(1);
    const ms = utterances[0].length / RATE * 1000;
    // pre-roll (~400 ms) + voz (1200 ms) + silencio de cierre (~800 ms)
    expect(ms).toBeGreaterThan(2200);
    expect(ms).toBeLessThan(2600);
  });

  it('discards clicks shorter than the minimum speech', () => {
    const utterances: Float32Array[] = [];
    const segmenter = new UtteranceSegmenter((samples) => utterances.push(samples));
    segmenter.push(tone(90));
    segmenter.push(silence(1500));
    expect(utterances).toHaveLength(0);
  });

  it('caps very long speech', () => {
    const utterances: Float32Array[] = [];
    const segmenter = new UtteranceSegmenter((samples) => utterances.push(samples), { maxUtteranceMs: 3000 });
    segmenter.push(tone(7000));
    expect(utterances.length).toBeGreaterThanOrEqual(2);
    expect(utterances[0].length / RATE * 1000).toBeLessThanOrEqual(3100);
  });

  it('downsamples 48 kHz to 16 kHz', () => {
    expect(downsample(new Float32Array(4800), 48000).length).toBe(1600);
    expect(downsample(Float32Array.of(1, 1, 1), 16000)).toEqual(Float32Array.of(1, 1, 1));
  });
});

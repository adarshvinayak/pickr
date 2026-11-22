import { describe, expect, it } from 'vitest';
import { Downsampler, floatToInt16, int16ToBase64 } from '../apps/customer/src/lib/voice-agent/pcm';

describe('native voice audio helpers', () => {
  it('converts floats to clipped 16-bit PCM', () => {
    expect(Array.from(floatToInt16([0, 1, -1, 2, -2, 0.5]))).toEqual([0, 32767, -32767, 32767, -32767, 16383]);
  });

  it('encodes little-endian PCM16 as base64 that round-trips', () => {
    const pcm = Int16Array.from([0, 1, -1, 32767, -32768]);
    const b64 = int16ToBase64(pcm);
    const back = Uint8Array.from(Buffer.from(b64, 'base64'));
    expect(Array.from(new Int16Array(back.buffer))).toEqual(Array.from(pcm));
  });

  it('passes 16 kHz input straight through', () => {
    const out = new Downsampler(16000).process([0.1, 0.2, 0.3], 16000);
    expect(Array.from(out).map((n) => +n.toFixed(2))).toEqual([0.1, 0.2, 0.3]);
  });

  it('averages 48 kHz down to 16 kHz and keeps the remainder between chunks', () => {
    const d = new Downsampler(16000);
    const first = d.process([3, 3, 3, 6, 6], 48000); // one full group of 3, two left over
    expect(Array.from(first)).toEqual([3]);
    const second = d.process([6, 9, 9, 9], 48000); // 6,6,6 then 9,9,9
    expect(Array.from(second)).toEqual([6, 9]);
  });

  it('produces the right number of samples over a long stream with chunking', () => {
    const d = new Downsampler(16000);
    let total = 0;
    for (let i = 0; i < 100; i++) total += d.process(new Float32Array(441), 44100).length; // 100 chunks of 10 ms = 1 second
    expect(total).toBeGreaterThanOrEqual(15999);
    expect(total).toBeLessThanOrEqual(16000);
  });
});

/** Small PCM helpers for the native audio path (kept dependency-free so they can be unit tested). */

export function floatToInt16(samples: ArrayLike<number>): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
  return out;
}

export function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Averages microphone samples down to the target rate (Gemini wants 16 kHz). The
 * remainder between calls is carried over so chunk boundaries stay seamless.
 * When the input already runs at the target rate the samples pass straight through.
 */
export class Downsampler {
  private carry: number[] = [];
  private pos = 0;

  constructor(private target = 16000) {}

  process(samples: ArrayLike<number>, rate: number): Float32Array {
    if (rate === this.target) return Float32Array.from(samples as ArrayLike<number>);
    const ratio = rate / this.target;
    for (let i = 0; i < samples.length; i++) this.carry.push(samples[i]);
    const out: number[] = [];
    while (this.pos + ratio <= this.carry.length) {
      const start = Math.floor(this.pos);
      const end = Math.floor(this.pos + ratio);
      let sum = 0;
      for (let i = start; i < end; i++) sum += this.carry[i];
      out.push(sum / Math.max(1, end - start));
      this.pos += ratio;
    }
    const drop = Math.floor(this.pos);
    this.carry = this.carry.slice(drop);
    this.pos -= drop;
    return Float32Array.from(out);
  }
}

import { type AudioIO, AudioUnavailable } from './audio-types';

/** Averages the microphone's native rate down to 16 kHz and posts Int16 PCM. */
const WORKLET = `
class Down extends AudioWorkletProcessor {
  constructor() { super(); this.ratio = sampleRate / 16000; this.acc = []; this.pos = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) this.acc.push(ch[i]);
    const out = [];
    while (this.pos + this.ratio <= this.acc.length) {
      const start = Math.floor(this.pos), end = Math.floor(this.pos + this.ratio);
      let sum = 0;
      for (let i = start; i < end; i++) sum += this.acc[i];
      out.push(sum / Math.max(1, end - start));
      this.pos += this.ratio;
    }
    const drop = Math.floor(this.pos);
    this.acc = this.acc.slice(drop);
    this.pos -= drop;
    if (out.length) {
      const pcm = new Int16Array(out.length);
      for (let i = 0; i < out.length; i++) pcm[i] = Math.max(-1, Math.min(1, out[i])) * 0x7fff;
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm16k', Down);
`;

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export function createAudio(): AudioIO {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
    throw new AudioUnavailable(
      'unsupported',
      typeof window !== 'undefined' && window.isSecureContext === false
        ? 'The microphone needs a secure page: open the app over https or on localhost, not a plain http address.'
        : 'This browser cannot capture the microphone.'
    );
  }
  let stream: MediaStream | null = null;
  let capture: AudioContext | null = null;
  let playback: AudioContext | null = null;
  let muted = false;
  let nextStart = 0;
  const sources = new Set<AudioBufferSourceNode>();
  let listener: (playing: boolean) => void = () => {};
  let pending: Int16Array[] = [];
  let pendingLength = 0;

  return {
    async start(onChunk) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (error) {
        const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
        throw new AudioUnavailable(denied ? 'denied' : 'failed', (error as Error).message);
      }
      try {
        capture = new AudioContext();
        playback = new AudioContext();
        await Promise.all([capture.resume(), playback.resume()]);
        const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
        await capture.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        const node = new AudioWorkletNode(capture, 'pcm16k', { numberOfInputs: 1, numberOfOutputs: 0 });
        node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          if (muted) return;
          pending.push(new Int16Array(event.data));
          pendingLength += pending[pending.length - 1].length;
          if (pendingLength < 640) return; // ~40 ms per message
          const merged = new Int16Array(pendingLength);
          let offset = 0;
          for (const part of pending) {
            merged.set(part, offset);
            offset += part.length;
          }
          pending = [];
          pendingLength = 0;
          onChunk(toBase64(new Uint8Array(merged.buffer)));
        };
        capture.createMediaStreamSource(stream).connect(node);
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop());
        throw new AudioUnavailable('failed', (error as Error).message);
      }
    },
    setMuted(value) {
      muted = value;
      if (value) {
        pending = [];
        pendingLength = 0;
      }
    },
    play(base64) {
      if (!playback) return;
      const bytes = fromBase64(base64);
      const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
      const buffer = playback.createBuffer(1, samples.length, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 0x8000;
      const source = playback.createBufferSource();
      source.buffer = buffer;
      source.connect(playback.destination);
      const startAt = Math.max(playback.currentTime + 0.02, nextStart);
      source.start(startAt);
      nextStart = startAt + buffer.duration;
      if (sources.size === 0) listener(true);
      sources.add(source);
      source.onended = () => {
        sources.delete(source);
        if (sources.size === 0) listener(false);
      };
    },
    interrupt() {
      for (const source of sources) {
        source.onended = null;
        try {
          source.stop();
        } catch {
          // already finished
        }
      }
      const wasPlaying = sources.size > 0;
      sources.clear();
      nextStart = 0;
      if (wasPlaying) listener(false);
    },
    onPlaying(next) {
      listener = next;
    },
    async stop() {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      await Promise.allSettled([capture?.close(), playback?.close()]);
      capture = null;
      playback = null;
      sources.clear();
    },
  };
}

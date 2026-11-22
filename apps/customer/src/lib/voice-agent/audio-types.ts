/** Microphone in (16 kHz PCM16) and speaker out (24 kHz PCM16), as Gemini Live expects. Chunks are base64. */
export type AudioIO = {
  /** Asks for the microphone and starts streaming chunks. Rejects with AudioUnavailable if it cannot. */
  start(onChunk: (base64Pcm16k: string) => void): Promise<void>;
  /** While muted, no microphone audio is sent (used while the customer is on the map). */
  setMuted(muted: boolean): void;
  /** Queues a model audio chunk for playback. */
  play(base64Pcm24k: string): void;
  /** Drops everything queued, because the customer started talking over the agent. */
  interrupt(): void;
  /** Called with true when playback starts and false when the queue has drained. */
  onPlaying(listener: (playing: boolean) => void): void;
  stop(): Promise<void>;
};

export type AudioUnavailableReason = 'denied' | 'unsupported' | 'failed';
export class AudioUnavailable extends Error {
  constructor(public reason: AudioUnavailableReason, message?: string) {
    super(message ?? reason);
  }
}

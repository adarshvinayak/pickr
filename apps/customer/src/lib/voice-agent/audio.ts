import { Platform } from 'react-native';

import { type AudioIO, AudioUnavailable } from './audio-types';
import { Downsampler, floatToInt16, int16ToBase64 } from './pcm';

/**
 * Android/iOS audio streaming through react-native-audio-api (a native module, so it
 * needs a development build; Expo Go reports "unsupported" and the voice sheet falls
 * back to the typed conversation).
 *
 * Capture: 16 kHz mono with the platform echo canceller on (Android
 * `voiceCommunication` preset, iOS voice-processing I/O), so the agent does not hear
 * itself and the customer can still interrupt it. Playback: Gemini's 24 kHz PCM16 is
 * decoded and queued in order on one buffer-queue source.
 */
export function createAudio(): AudioIO {
  let api: typeof import('react-native-audio-api');
  try {
    // Required lazily so a build without the native module still loads this screen.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    api = require('react-native-audio-api');
  } catch {
    throw new AudioUnavailable('unsupported', 'Live voice needs a development build on this device.');
  }
  const { AudioContext, AudioManager, AudioRecorder, decodePCMInBase64 } = api;

  let recorder: InstanceType<typeof AudioRecorder> | null = null;
  let context: InstanceType<typeof AudioContext> | null = null;
  let queue: ReturnType<InstanceType<typeof AudioContext>['createBufferQueueSource']> | null = null;
  let muted = false;
  let listener: (playing: boolean) => void = () => {};
  let playing = false;
  let pending = 0;
  let generation = 0;
  let decodeChain: Promise<void> = Promise.resolve();
  const down = new Downsampler(16000);

  const settle = (count = 1) => {
    pending = Math.max(0, pending - count);
    if (pending === 0 && playing) {
      playing = false;
      listener(false);
    }
  };

  return {
    async start(onChunk) {
      const permission = await AudioManager.requestRecordingPermissions();
      if (permission !== 'Granted') throw new AudioUnavailable('denied');
      try {
        AudioManager.setSystemOptions({
          ios: { category: 'playAndRecord', mode: 'voiceChat', options: ['defaultToSpeaker', 'allowBluetoothHFP'] },
          // Communication mode (API 31+) enables the hardware echo canceller; route to the loudspeaker so it is hands-free.
          android: Platform.OS === 'android' && Number(Platform.Version) >= 31 ? { mode: 'inCommunication', communicationDevice: 'speaker' } : {},
        });
        await AudioManager.setAudioSessionActivity(true);

        context = new AudioContext({ sampleRate: 24000 });
        queue = context.createBufferQueueSource();
        queue.onbufferended = () => settle();
        queue.connect(context.destination);
        queue.start();

        recorder = new AudioRecorder({ androidInputPreset: 'voiceCommunication', iosVoiceProcessing: true });
        recorder.onError((event) => console.warn('Voice recorder error', event));
        recorder.onAudioReady({ sampleRate: 16000, bufferLength: 640, channelCount: 1 }, ({ buffer }) => {
          if (muted) return;
          const pcm = floatToInt16(down.process(buffer.getChannelData(0), buffer.sampleRate));
          if (pcm.length) onChunk(int16ToBase64(pcm));
        });
        const started = await recorder.start();
        if (started.status === 'error') throw new Error(started.message);
      } catch (error) {
        await this.stop();
        if (error instanceof AudioUnavailable) throw error;
        throw new AudioUnavailable('failed', (error as Error).message);
      }
    },
    setMuted(value) {
      muted = value;
    },
    play(base64) {
      const mine = generation;
      pending += 1;
      if (!playing) {
        playing = true;
        listener(true);
      }
      // Decoding is async; chaining keeps the chunks in the order they arrived.
      decodeChain = decodeChain
        .then(async () => {
          if (mine !== generation || !queue) return settle();
          const buffer = await decodePCMInBase64(base64, 24000, 1, true);
          if (mine !== generation || !queue) return settle();
          queue.enqueueBuffer(buffer);
        })
        .catch((error) => {
          console.warn('Voice playback chunk failed', error);
          settle();
        });
    },
    interrupt() {
      generation += 1;
      try {
        queue?.clearBuffers();
      } catch {
        // node already stopped
      }
      pending = 0;
      if (playing) {
        playing = false;
        listener(false);
      }
    },
    onPlaying(next) {
      listener = next;
    },
    async stop() {
      generation += 1;
      const r = recorder;
      const c = context;
      const q = queue;
      recorder = null;
      context = null;
      queue = null;
      try {
        r?.clearOnAudioReady();
        await r?.stop();
      } catch {
        // not recording
      }
      try {
        q?.stop();
        await c?.close();
      } catch {
        // already closed
      }
      try {
        await AudioManager.setAudioSessionActivity(false);
      } catch {
        // session already released
      }
    },
  };
}

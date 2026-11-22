/**
 * Opt-in integration test against the real Gemini API (costs a few cents, needs network).
 *   LIVE_GEMINI=1 GEMINI_API_KEY=... npx vitest run tests/voice-agent.live.test.ts
 * It mints a real ephemeral token, opens a Live session with the production prompt and
 * tools, and drives the same BookingAgent the app uses.
 */
import { GoogleGenAI, type LiveServerMessage, type Session } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { AgentContextSchema, createAgentToken } from '@/lib/voice-agent';
import { BookingAgent } from '../apps/customer/src/lib/voice-agent/controller';
import { Downsampler, floatToInt16, int16ToBase64 } from '../apps/customer/src/lib/voice-agent/pcm';

const live = process.env.LIVE_GEMINI === '1' && !!process.env.GEMINI_API_KEY;
const ctx = AgentContextSchema.parse({
  language: 'en',
  materials: [
    { id: 'p-sand', en: 'P-Sand', ml: 'പി-സാൻഡ്', measure: 'units', min: 1, max: 50, unit: 'units (1 unit = 100 cubic feet)' },
    { id: 'm-sand', en: 'M-Sand', ml: 'എം-സാൻഡ്', measure: 'units', min: 1, max: 50, unit: 'units (1 unit = 100 cubic feet)' },
    { id: 'red-bricks', en: 'Red Bricks', ml: 'ചുവന്ന ഇഷ്ടിക', measure: 'bricks', min: 100, max: 20000, unit: 'bricks (pieces)' },
  ],
  savedSites: [{ id: 'site-1', name: 'Ollur godown (Ollur, Thrissur)' }],
});

function newAgent() {
  return new BookingAgent({
    items: ctx.materials.map((m) => ({ id: m.id, measure: m.measure, min: m.min, max: m.max })),
    saved: [{ id: 'site-1', site: { label: 'Ollur, Thrissur', source: 'saved', coords: { latitude: 10.5, longitude: 76.2 } } }],
    checkSchedule: (i, now) => {
      const d = new Date(now);
      d.setDate(d.getDate() + i.dayOffset);
      d.setHours((Number(i.hour) % 12) + (i.meridiem === 'PM' ? 12 : 0), Number(i.minute), 0, 0);
      return d > now ? { ok: true, date: d } : { ok: false, reason: 'past' };
    },
    asapBlockedUntil: () => null,
  });
}

type Turn = { calls: string[]; heard: string; said: string; audioBytes: number; done: boolean };

async function openSession(agent: BookingAgent) {
  const { token, model } = await createAgentToken(ctx, `live-test-${Date.now()}`);
  expect(token.startsWith('auth_tokens/')).toBe(true);
  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });
  let turn: Turn = { calls: [], heard: '', said: '', audioBytes: 0, done: false };
  let wake: () => void = () => {};
  let session!: Session;
  session = await ai.live.connect({
    model,
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        const c = m.serverContent;
        for (const p of c?.modelTurn?.parts ?? []) if (p.inlineData?.data) turn.audioBytes += p.inlineData.data.length * 0.75;
        if (c?.inputTranscription?.text) turn.heard += c.inputTranscription.text;
        if (c?.outputTranscription?.text) turn.said += c.outputTranscription.text;
        const calls = m.toolCall?.functionCalls;
        if (calls?.length) {
          const responses = calls.map((f) => {
            turn.calls.push(`${f.name}(${JSON.stringify(f.args)})`);
            const r = agent.handle(f.name ?? '', (f.args ?? {}) as Record<string, unknown>);
            return { id: f.id ?? '', name: f.name ?? '', response: r.response };
          });
          session.sendToolResponse({ functionResponses: responses });
        }
        if (c?.turnComplete) {
          turn.done = true;
          wake();
        }
      },
      onerror: (e: { message?: string }) => console.log('LIVE ERROR', e.message),
      onclose: (e: { reason?: string; code?: number }) => console.log('LIVE CLOSED', e.code, e.reason),
    },
  });
  /** Runs one exchange and waits for the model to finish (including follow-up after tool calls). */
  const exchange = async (send: () => void, ms = 40000): Promise<Turn> => {
    turn = { calls: [], heard: '', said: '', audioBytes: 0, done: false };
    send();
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timed out waiting for turnComplete')), ms);
      wake = () => {
        // A tool-call round trip ends with a second turnComplete; settle shortly after the last one.
        clearTimeout(t);
        setTimeout(resolve, 1500);
      };
    });
    return turn;
  };
  return { session, exchange, model };
}

describe.skipIf(!live)('Gemini Live voice agent (real API)', () => {
  it('greets, fills a booking from one sentence, uses a saved site, and sends an unknown place to the map', async () => {
    const agent = newAgent();
    const { session, exchange, model } = await openSession(agent);
    console.log('model:', model);

    const greet = await exchange(() => session.sendRealtimeInput({ text: '[app] The customer opened voice booking. Greet them in one short sentence in English and ask what they want to move.' }));
    console.log('GREETING:', greet.said, '| audio bytes:', Math.round(greet.audioBytes));
    expect(greet.audioBytes).toBeGreaterThan(1000);

    const t1 = await exchange(() =>
      session.sendRealtimeInput({ text: 'I need 2 units of M-Sand picked up from my Ollur godown and delivered to Ayyanthole, tomorrow at 11 am.' })
    );
    console.log('TURN 1 calls:', t1.calls, '\nsaid:', t1.said, '\nstate:', JSON.stringify(agent.state), '\nmissing:', agent.missing(), '\nawaiting:', agent.awaiting);
    expect(agent.state.itemId).toBe('m-sand');
    expect(agent.state.quantity).toBe(2);
    expect(agent.state.when).toMatchObject({ mode: 'schedule', dayOffset: 1, hour: '11', meridiem: 'AM' });
    expect(agent.state.pickup?.source).toBe('saved');
    expect(agent.state.drop).toBeUndefined(); // Ayyanthole is not saved: must go to the map, never guessed
    expect(agent.awaiting).toBe('drop');

    // The map flow: the app reports a pick and the agent must finish.
    agent.siteChosen('drop', { label: 'Ayyanthole', source: 'map', coords: { latitude: 10.52, longitude: 76.21 } });
    const t2 = await exchange(() => session.sendRealtimeInput({ text: '[app] The customer chose the drop location on the map. Still missing: nothing. Continue.' }));
    console.log('TURN 2 calls:', t2.calls, '\nsaid:', t2.said);
    expect(t2.calls.some((c) => c.startsWith('finish_booking'))).toBe(true);
    session.close();
  }, 120000);

  it('asks for what is missing instead of guessing', async () => {
    const agent = newAgent();
    const { session, exchange } = await openSession(agent);
    await exchange(() => session.sendRealtimeInput({ text: '[app] The customer opened voice booking. Greet them briefly and ask what they want to move.' }));
    const t = await exchange(() => session.sendRealtimeInput({ text: 'I want some bricks from Ollur godown.' }));
    console.log('PARTIAL calls:', t.calls, '\nsaid:', t.said, '\nmissing:', agent.missing());
    expect(agent.state.itemId).toBe('red-bricks');
    expect(agent.state.quantity).toBeUndefined();
    expect(agent.state.drop).toBeUndefined();
    expect(agent.state.when).toBeUndefined();
    expect(t.calls.some((c) => c.startsWith('finish_booking'))).toBe(false);
    expect(t.said.trim().length).toBeGreaterThan(5);
    session.close();
  }, 120000);

  it('understands spoken Malayalam audio and answers in Malayalam', async () => {
    const apiKey = process.env.GEMINI_API_KEY!;
    const ai = new GoogleGenAI({ apiKey });
    const ttsModel = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
    const speech = await ai.models.generateContent({
      model: ttsModel,
      contents: [{ parts: [{ text: 'എനിക്ക് രണ്ട് യൂണിറ്റ് എം സാൻഡ് വേണം, നാളെ രാവിലെ പതിനൊന്ന് മണിക്ക്.' }] }],
      config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } },
    });
    const b64 = speech.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    expect(b64, 'TTS returned audio').toBeTruthy();
    const pcm24 = new Int16Array(Uint8Array.from(Buffer.from(b64!, 'base64')).buffer);
    const f = Float32Array.from(pcm24, (v) => v / 32768);
    const pcm16 = floatToInt16(new Downsampler(16000).process(f, 24000)); // 24k -> 16k (ratio 1.5)
    console.log('Malayalam utterance samples @16k:', pcm16.length);

    const agent = newAgent();
    const { session, exchange } = await openSession(agent);
    const t = await exchange(() => {
      const CH = 640;
      for (let i = 0; i < pcm16.length; i += CH) {
        session.sendRealtimeInput({ audio: { data: int16ToBase64(pcm16.subarray(i, i + CH)), mimeType: 'audio/pcm;rate=16000' } });
      }
      // trailing silence so server-side voice detection ends the user's turn
      session.sendRealtimeInput({ audio: { data: int16ToBase64(new Int16Array(16000 * 2)), mimeType: 'audio/pcm;rate=16000' } });
    }, 60000);
    console.log('ML heard:', t.heard, '\nML calls:', t.calls, '\nML said:', t.said, '\nstate:', JSON.stringify(agent.state));
    expect(/[ഀ-ൿ]/.test(t.said), 'agent replied in Malayalam script').toBe(true);
    expect(agent.state.itemId).toBe('m-sand');
    session.close();
  }, 150000);
  it('switches language on the fly: English, then Malayalam, then English again', async () => {
    const agent = newAgent();
    const { session, exchange } = await openSession(agent);
    const ml = (x: string) => /[\u0D00-\u0D7F]/.test(x);
    const a = await exchange(() => session.sendRealtimeInput({ text: 'Hi, I need to book a truck for P-Sand.' }));
    console.log('SWITCH en:', a.said);
    expect(ml(a.said)).toBe(false);
    const b = await exchange(() => session.sendRealtimeInput({ text: 'രണ്ട് യൂണിറ്റ് വേണം, ഇപ്പോൾ തന്നെ.' }));
    console.log('SWITCH ml:', b.said, JSON.stringify(agent.state));
    expect(ml(b.said)).toBe(true);
    expect(agent.state.quantity).toBe(2);
    const c = await exchange(() => session.sendRealtimeInput({ text: 'Sorry, please continue in English.' }));
    console.log('SWITCH en again:', c.said);
    expect(ml(c.said)).toBe(false);
    session.close();
  }, 150000);
});

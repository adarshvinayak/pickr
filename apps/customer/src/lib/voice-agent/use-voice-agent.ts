import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { type BookingDraft, useBooking } from '@/lib/booking';
import { ITEMS, QUANTITY } from '@/lib/catalog';
import { asapBlockedUntil, checkSchedule } from '@/lib/schedule';
import { useSession } from '@/lib/session';
import { useSites } from '@/lib/sites';

import { createAudio } from './audio';
import { type AudioIO, AudioUnavailable } from './audio-types';
import { type AgentSite, BookingAgent, detectLanguage, type Effect, type Missing, type Role } from './controller';
import { connectLive, type LiveConnection } from './live';

export type AgentStatus = 'connecting' | 'listening' | 'speaking' | 'paused' | 'finishing' | 'unavailable' | 'ended';
export type UnavailableReason = 'denied' | 'unsupported' | 'no-service' | 'failed';

const UNIT_WORDS: Record<string, string> = {
  units: 'units (1 unit = 100 cubic feet)',
  bricks: 'bricks (pieces)',
  blocks: 'blocks (pieces)',
};
/** Longest we wait for the agent's closing sentence before opening the summary anyway. */
const FINISH_WAIT_MS = 8000;

type Options = {
  /** All details gathered: open the booking summary (via the transit-pass step when needed). */
  onFinish: (needsPass: boolean) => void;
  /** The customer asked the agent to stop. */
  onCancel: () => void;
};

/**
 * Runs one Gemini Live voice-booking conversation. It owns the microphone, the
 * model connection and the `BookingAgent` (which validates every tool call), and
 * mirrors what was captured into the app's booking draft so the normal screens
 * (map picker, transit pass, summary) show it. Location is never inferred: the
 * agent either uses a saved site or sends the customer to the map picker and
 * resumes when they return.
 */
export function useVoiceAgent({ onFinish, onCancel }: Options) {
  const { language, setLanguage } = useSession();
  const { favourites } = useSites();
  const { draft, start, chooseItem, setQuantity, update } = useBooking();

  const [status, setStatus] = useState<AgentStatus>('connecting');
  const [reason, setReason] = useState<UnavailableReason | null>(null);
  const [detail, setDetail] = useState('');
  const [muted, setMutedState] = useState(false);
  const [heard, setHeard] = useState('');
  const [said, setSaid] = useState('');
  const [captured, setCaptured] = useState<{ missing: Missing[]; state: BookingAgent['state'] }>({ missing: ['material', 'quantity', 'pickup_location', 'drop_location', 'time'], state: {} });

  const agent = useRef<BookingAgent | null>(null);
  const conn = useRef<LiveConnection | null>(null);
  const audio = useRef<AudioIO | null>(null);
  const draftRef = useRef<BookingDraft>(draft);
  const handlers = useRef({ onFinish, onCancel });
  const languageRef = useRef(language);
  const started = useRef(false);
  const pendingMap = useRef<{ role: Role; before: AgentSite | null } | null>(null);
  const finishing = useRef<{ needsPass: boolean; turnDone: boolean; timer: ReturnType<typeof setTimeout> } | null>(null);
  const playing = useRef(false);
  const heardTurn = useRef('');
  const saidFresh = useRef(true);
  const stopped = useRef(false);

  const publish = useCallback(() => {
    const a = agent.current;
    if (a) setCaptured({ missing: a.missing(), state: { ...a.state } });
  }, []);

  /** Mirrors the agent's captured details into the booking draft the other screens read. */
  const syncDraft = useCallback(() => {
    const a = agent.current;
    if (!a) return;
    const s = a.state;
    if (!started.current && (s.itemId || s.pickup || s.drop || s.when)) {
      start();
      started.current = true;
    }
    if (s.itemId) chooseItem(s.itemId);
    if (s.quantity !== undefined) setQuantity(s.quantity);
    update({
      ...(s.pickup ? { pickup: s.pickup } : {}),
      ...(s.drop ? { delivery: s.drop } : {}),
      ...(s.when ? { when: s.when.mode === 'now' ? { mode: 'now' as const } : { ...s.when } } : {}),
      ...(s.labourNeeded !== undefined ? { labourNeeded: s.labourNeeded } : {}),
      ...(s.notes ? { notes: s.notes } : {}),
    });
    publish();
  }, [chooseItem, publish, setQuantity, start, update]);

  const syncRef = useRef(syncDraft);
  // Long-lived callbacks (audio, socket) read the latest values through refs.
  useEffect(() => {
    draftRef.current = draft;
    handlers.current = { onFinish, onCancel };
    languageRef.current = language;
    syncRef.current = syncDraft;
  });

  const teardown = useCallback(() => {
    if (stopped.current) return;
    stopped.current = true;
    if (finishing.current) clearTimeout(finishing.current.timer);
    conn.current?.close();
    void audio.current?.stop();
  }, []);

  const tryFinish = useCallback(() => {
    const f = finishing.current;
    if (!f || !f.turnDone || playing.current) return;
    clearTimeout(f.timer);
    finishing.current = null;
    teardown();
    handlers.current.onFinish(f.needsPass);
  }, [teardown]);

  const runEffect = useCallback(
    (effect: Effect) => {
      if (!effect) return;
      if (effect.type === 'map') {
        const current = effect.role === 'pickup' ? draftRef.current.pickup : draftRef.current.delivery;
        pendingMap.current = { role: effect.role, before: current };
        audio.current?.setMuted(true);
        setStatus('paused');
        router.push({ pathname: '/book/map', params: { purpose: effect.role === 'drop' ? 'delivery' : 'pickup' } });
      } else if (effect.type === 'finish') {
        setStatus('finishing');
        const timer = setTimeout(() => {
          if (finishing.current) {
            finishing.current.turnDone = true;
            playing.current = false;
            tryFinish();
          }
        }, FINISH_WAIT_MS);
        finishing.current = { needsPass: effect.needsPass, turnDone: false, timer };
      } else {
        teardown();
        setStatus('ended');
        handlers.current.onCancel();
      }
    },
    [teardown, tryFinish]
  );

  const unavailable = useCallback(
    (why: UnavailableReason, message = '') => {
      console.warn(`Voice agent unavailable (${why}): ${message}`);
      teardown();
      setReason(why);
      setDetail(message);
      setStatus('unavailable');
    },
    [teardown]
  );

  // Start the conversation once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = ITEMS.filter((i) => QUANTITY[i.measure]);
      agent.current = new BookingAgent({
        items: items.map((i) => ({ id: i.id, measure: i.measure, min: QUANTITY[i.measure].min, max: QUANTITY[i.measure].max, transitPass: i.transitPass })),
        saved: favourites
          .filter((f) => f.coords)
          .map((f) => ({ id: f.id, site: { label: f.label, source: 'saved' as const, coords: f.coords } })),
        checkSchedule,
        asapBlockedUntil,
      });
      let io: AudioIO;
      try {
        io = createAudio();
        audio.current = io;
        io.onPlaying((p) => {
          playing.current = p;
          if (p) setStatus((s) => (s === 'listening' ? 'speaking' : s));
          else {
            setStatus((s) => (s === 'speaking' ? 'listening' : s));
            tryFinish();
          }
        });
        await io.start((chunk) => conn.current?.sendAudio(chunk));
      } catch (error) {
        if (!cancelled) unavailable(error instanceof AudioUnavailable ? error.reason : 'failed', (error as Error).message);
        return;
      }
      if (cancelled) return void io.stop();
      try {
        const session = await api<{ token: string; model: string }>('voice/session', {
          language: languageRef.current,
          materials: items.map((i) => ({
            id: i.id,
            en: i.name.en,
            ml: i.name.ml,
            measure: i.measure,
            min: QUANTITY[i.measure].min,
            max: QUANTITY[i.measure].max,
            unit: UNIT_WORDS[i.measure] ?? i.measure,
            transitPass: i.transitPass,
          })),
          savedSites: favourites
            .filter((f) => f.coords)
            .slice(0, 30)
            .map((f) => ({ id: f.id, name: (f.name && f.name !== f.label ? `${f.name} (${f.label})` : f.label).slice(0, 120) })),
        });
        if (cancelled) return;
        conn.current = await connectLive(session.token, session.model, {
          onAudio: (data) => audio.current?.play(data),
          onInputText: (text) => {
            heardTurn.current += text;
            setHeard(heardTurn.current.trim());
            const lang = detectLanguage(heardTurn.current);
            if (lang && lang !== languageRef.current) setLanguage(lang);
          },
          onOutputText: (text) => {
            const fresh = saidFresh.current;
            saidFresh.current = false;
            setSaid((previous) => (fresh ? text : previous + text));
          },
          onInterrupted: () => audio.current?.interrupt(),
          onTurnComplete: () => {
            heardTurn.current = '';
            saidFresh.current = true;
            if (finishing.current) {
              finishing.current.turnDone = true;
              tryFinish();
            }
          },
          onToolCalls: (calls) => {
            const effects: Effect[] = [];
            const responses = calls.map((call) => {
              const result = agent.current!.handle(call.name, call.args);
              effects.push(result.effect);
              return { id: call.id, name: call.name, response: result.response };
            });
            syncRef.current();
            conn.current?.sendToolResponses(responses);
            effects.forEach(runEffect);
          },
          onClose: (message) => {
            if (stopped.current || finishing.current) return;
            console.warn('Voice session closed:', message);
            unavailable('failed', message);
          },
        });
        if (cancelled) return conn.current.close();
        setStatus('listening');
        conn.current.sendText(`[app] The customer opened voice booking. Greet them in one short sentence in ${languageRef.current === 'ml' ? 'Malayalam' : 'English'} and ask what they want to move.`);
      } catch (error) {
        console.warn('Voice session failed:', (error as Error).message);
        if (!cancelled) unavailable('no-service', (error as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      teardown();
    };
    // One conversation per mount; saved sites are read when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The customer chose a point on the map: record it and tell the agent to carry on.
  useEffect(() => {
    const waiting = pendingMap.current;
    const a = agent.current;
    if (!waiting || !a || a.awaiting !== waiting.role) return;
    const site = waiting.role === 'pickup' ? draft.pickup : draft.delivery;
    if (!site?.coords || site === waiting.before) return;
    pendingMap.current = null;
    const note = a.siteChosen(waiting.role, site);
    publish();
    conn.current?.sendText(note);
  }, [draft.pickup, draft.delivery, publish]);

  // Back from the map: listen again, and if nothing was chosen tell the agent.
  useFocusEffect(
    useCallback(() => {
      const waiting = pendingMap.current;
      if (!waiting) {
        setStatus((s) => (s === 'paused' ? 'listening' : s));
        audio.current?.setMuted(muted);
        return;
      }
      const timer = setTimeout(() => {
        const still = pendingMap.current;
        if (!still || !agent.current) return;
        pendingMap.current = null;
        conn.current?.sendText(agent.current.mapClosed(still.role));
        publish();
      }, 700);
      audio.current?.setMuted(muted);
      setStatus((s) => (s === 'paused' ? 'listening' : s));
      return () => clearTimeout(timer);
    }, [muted, publish])
  );

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value);
    audio.current?.setMuted(value);
  }, []);

  const stop = useCallback(() => {
    teardown();
    setStatus('ended');
  }, [teardown]);

  return { status, reason, detail, muted, setMuted, heard, said, captured, stop };
}

import { describe, expect, it } from 'vitest';
import { type AgentDeps, BookingAgent, detectLanguage } from '../apps/customer/src/lib/voice-agent/controller';

const site = (label: string) => ({ label, source: 'saved' as const, coords: { latitude: 10.5, longitude: 76.2 } });
function make(over: Partial<AgentDeps> = {}) {
  return new BookingAgent({
    items: [
      { id: 'm-sand', measure: 'units', min: 1, max: 50 },
      { id: 'red-bricks', measure: 'bricks', min: 100, max: 20000 },
      { id: 'river-sand', measure: 'units', min: 1, max: 50, transitPass: true },
    ],
    saved: [{ id: 's1', site: site('Ollur godown, Thrissur') }],
    checkSchedule: (i, now) => {
      const d = new Date(now);
      d.setDate(d.getDate() + i.dayOffset);
      d.setHours((Number(i.hour) % 12) + (i.meridiem === 'PM' ? 12 : 0), Number(i.minute), 0, 0);
      return d > now ? { ok: true, date: d } : { ok: false, reason: 'past' };
    },
    asapBlockedUntil: () => null,
    now: () => new Date('2026-11-20T10:00:00'),
    ...over,
  });
}

describe('one sentence fills everything it can, then the agent asks only for the rest', () => {
  it('captures material, quantity and time, and reports the locations still missing', () => {
    const a = make();
    const r = a.handle('update_booking', { material_id: 'm-sand', quantity: 2, when_mode: 'schedule', day_offset: 1, hour: 11, minute: 0, meridiem: 'AM' });
    expect(r.response.ok).toBe(true);
    expect(r.response.missing).toEqual(['pickup_location', 'drop_location']);
  });

  it('does not let the model finish while anything is missing', () => {
    const a = make();
    a.handle('update_booking', { material_id: 'm-sand', quantity: 2, when_mode: 'now' });
    const r = a.handle('finish_booking');
    expect(r.effect).toBeNull();
    expect(r.response.ok).toBe(false);
    expect(r.response.missing).toEqual(['pickup_location', 'drop_location']);
  });

  it('never assumes quantity or time', () => {
    const a = make();
    a.handle('update_booking', { material_id: 'm-sand' });
    expect(a.missing()).toEqual(['quantity', 'pickup_location', 'drop_location', 'time']);
  });
});

describe('locations are never guessed', () => {
  it('uses a saved place only when its id exists', () => {
    const a = make();
    expect((a.handle('use_saved_site', { role: 'pickup', site_id: 's1' }).response as Record<string, unknown>).ok).toBe(true);
    expect(a.state.pickup?.source).toBe('saved');
    const bad = a.handle('use_saved_site', { role: 'drop', site_id: 'made-up' }).response as Record<string, unknown>;
    expect(bad.ok).toBe(false);
    expect(a.state.drop).toBeUndefined();
  });

  it('sends everything else to the map and waits for the customer', () => {
    const a = make();
    const r = a.handle('request_map_pick', { role: 'pickup' });
    expect(r.effect).toEqual({ type: 'map', role: 'pickup' });
    expect(a.awaiting).toBe('pickup');
    expect(a.state.pickup).toBeUndefined();
  });

  it('resumes after the map: records the site and names what is still missing', () => {
    const a = make();
    a.handle('update_booking', { material_id: 'm-sand', quantity: 2, when_mode: 'now' });
    a.handle('request_map_pick', { role: 'pickup' });
    const note = a.siteChosen('pickup', { label: 'X', source: 'map', coords: { latitude: 10, longitude: 76 } });
    expect(a.awaiting).toBeNull();
    expect(note).toContain('drop_location');
    a.handle('use_saved_site', { role: 'drop', site_id: 's1' });
    const done = a.handle('finish_booking');
    expect(done.effect).toEqual({ type: 'finish', needsPass: false });
  });

  it('tells the model when the map was closed without a pick', () => {
    const a = make();
    a.handle('request_map_pick', { role: 'drop' });
    expect(a.mapClosed('drop')).toContain('closed without');
    expect(a.awaiting).toBeNull();
  });
});

describe('validation the model cannot bypass', () => {
  it('rejects out-of-range quantity', () => {
    const a = make();
    const r = a.handle('update_booking', { material_id: 'm-sand', quantity: 500 }).response as Record<string, unknown>;
    expect(r.ok).toBe(false);
    expect(a.state.quantity).toBeUndefined();
  });

  it('rejects unknown materials and a time in the past', () => {
    const a = make();
    expect((a.handle('update_booking', { material_id: 'gold' }).response as Record<string, unknown>).ok).toBe(false);
    const past = a.handle('update_booking', { when_mode: 'schedule', day_offset: 0, hour: 8, minute: 0, meridiem: 'AM' }).response as Record<string, unknown>;
    expect(past.ok).toBe(false);
    expect(a.state.when).toBeUndefined();
  });

  it('asks again for the quantity when the material changes to a different unit', () => {
    const a = make();
    a.handle('update_booking', { material_id: 'm-sand', quantity: 2 });
    const r = a.handle('update_booking', { material_id: 'red-bricks' }).response as Record<string, unknown>;
    expect(a.state.quantity).toBeUndefined();
    expect((r.applied as Record<string, unknown>).quantity_cleared).toBeTruthy();
  });

  it('honours a blocked "now"', () => {
    const a = make({ asapBlockedUntil: () => '10:00 AM' });
    const r = a.handle('update_booking', { when_mode: 'now' }).response as Record<string, unknown>;
    expect(r.ok).toBe(false);
    expect(a.state.when).toBeUndefined();
  });

  it('flags the transit pass step for river sand', () => {
    const a = make();
    a.handle('update_booking', { material_id: 'river-sand', quantity: 1, when_mode: 'now' });
    a.handle('use_saved_site', { role: 'pickup', site_id: 's1' });
    a.handle('use_saved_site', { role: 'drop', site_id: 's1' });
    expect(a.handle('finish_booking').effect).toEqual({ type: 'finish', needsPass: true });
  });
});

describe('language detection', () => {
  it('detects Malayalam script and English, and ignores tiny fragments', () => {
    expect(detectLanguage('എനിക്ക് രണ്ട് യൂണിറ്റ് എം സാൻഡ് വേണം')).toBe('ml');
    expect(detectLanguage('I need two units of M-Sand')).toBe('en');
    expect(detectLanguage('ok')).toBeNull();
  });
});

/**
 * The voice agent's booking brain, kept free of React, navigation and audio so it
 * can be tested on its own. Gemini decides what the customer meant and calls tools;
 * this module is the authority on what is valid and what is still missing. The model
 * cannot skip a requirement: `finish_booking` only succeeds when nothing is missing,
 * and no tool accepts a free-text address, so a location is either one of the
 * customer's saved sites or a point they picked on the map.
 */
export type Role = 'pickup' | 'drop';
export type AgentSite = { label: string; source: 'gps' | 'manual' | 'map' | 'saved'; coords?: { latitude: number; longitude: number } };
export type AgentItem = { id: string; measure: string; min: number; max: number; transitPass?: boolean };
export type ScheduleInput = { dayOffset: number; hour: string; minute: string; meridiem: 'AM' | 'PM' };
export type AgentWhen = { mode: 'now' } | ({ mode: 'schedule' } & ScheduleInput);
export type Missing = 'material' | 'quantity' | 'pickup_location' | 'drop_location' | 'time';

export type AgentState = {
  itemId?: string;
  quantity?: number;
  when?: AgentWhen;
  pickup?: AgentSite;
  drop?: AgentSite;
  labourNeeded?: boolean;
  notes?: string;
};

export type Effect = { type: 'map'; role: Role } | { type: 'finish'; needsPass: boolean } | { type: 'cancel' } | null;
export type ToolResult = { response: Record<string, unknown>; effect: Effect };

export type AgentDeps = {
  items: AgentItem[];
  saved: { id: string; site: AgentSite }[];
  checkSchedule: (input: ScheduleInput, now: Date) => { ok: true; date: Date } | { ok: false; reason: string };
  /** Non-null when "now" is not allowed at this moment (e.g. a school-hour window). */
  asapBlockedUntil: (now: Date) => string | null;
  now?: () => Date;
};

const num = (value: unknown) => (typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN);
const role = (value: unknown): Role | null => (value === 'pickup' || value === 'drop' ? value : null);

export class BookingAgent {
  state: AgentState = {};
  /** The location the customer has been sent to pick on the map. */
  awaiting: Role | null = null;

  constructor(private deps: AgentDeps) {}

  private item() {
    return this.deps.items.find((i) => i.id === this.state.itemId);
  }

  missing(): Missing[] {
    const s = this.state;
    const out: Missing[] = [];
    if (!s.itemId) out.push('material');
    if (s.quantity === undefined) out.push('quantity');
    if (!s.pickup) out.push('pickup_location');
    if (!s.drop) out.push('drop_location');
    if (!s.when) out.push('time');
    return out;
  }

  private snapshot(extra: Record<string, unknown> = {}) {
    const missing = this.missing();
    return { missing, awaiting_map: this.awaiting, ...extra };
  }

  handle(name: string, args: Record<string, unknown> = {}): ToolResult {
    switch (name) {
      case 'update_booking':
        return { response: this.update(args), effect: null };
      case 'use_saved_site':
        return { response: this.useSaved(args), effect: null };
      case 'request_map_pick':
        return this.requestMap(args);
      case 'finish_booking':
        return this.finish();
      case 'cancel_voice_booking':
        return { response: { ok: true }, effect: { type: 'cancel' } };
      default:
        return { response: { ok: false, error: `Unknown tool ${name}.` }, effect: null };
    }
  }

  private update(args: Record<string, unknown>) {
    const errors: string[] = [];
    const applied: Record<string, unknown> = {};
    const s = this.state;

    if (args.material_id !== undefined) {
      const item = this.deps.items.find((i) => i.id === args.material_id);
      if (!item) errors.push('material_id is not in the list. Ask the customer which material they need.');
      else {
        const previous = this.item();
        s.itemId = item.id;
        applied.material = item.id;
        if (previous && previous.measure !== item.measure && s.quantity !== undefined) {
          delete s.quantity;
          applied.quantity_cleared = 'This material is counted in a different unit, so ask for the quantity again.';
        }
      }
    }

    if (args.quantity !== undefined) {
      const item = this.item();
      const n = Math.round(num(args.quantity));
      if (!item) errors.push('Choose the material before the quantity.');
      else if (!Number.isFinite(n)) errors.push('quantity must be a number.');
      else if (n < item.min || n > item.max) errors.push(`quantity must be between ${item.min} and ${item.max} for this material. Ask the customer again.`);
      else {
        s.quantity = n;
        applied.quantity = n;
        delete (applied as Record<string, unknown>).quantity_cleared;
      }
    }

    if (args.when_mode !== undefined) {
      const now = (this.deps.now ?? (() => new Date()))();
      if (args.when_mode === 'now') {
        const until = this.deps.asapBlockedUntil(now);
        if (until) errors.push(`Trucks cannot start right now; the earliest is ${until}. Ask for a later time.`);
        else {
          s.when = { mode: 'now' };
          applied.time = 'now';
        }
      } else if (args.when_mode === 'schedule') {
        const dayOffset = num(args.day_offset);
        const hour = num(args.hour);
        const minute = args.minute === undefined ? 0 : num(args.minute);
        const meridiem = args.meridiem === 'AM' || args.meridiem === 'PM' ? args.meridiem : null;
        if (!Number.isInteger(dayOffset) || dayOffset < 0 || dayOffset > 6 || !Number.isInteger(hour) || !Number.isInteger(minute) || !meridiem) {
          errors.push('A scheduled time needs day_offset (0-6), hour (1-12), minute and AM or PM. Ask for the missing part.');
        } else {
          const input: ScheduleInput = { dayOffset, hour: String(hour), minute: String(minute).padStart(2, '0'), meridiem };
          const check = this.deps.checkSchedule(input, now);
          if (!check.ok) {
            errors.push(
              check.reason === 'past'
                ? 'That time has already passed. Ask for a time in the future.'
                : check.reason === 'restricted'
                  ? 'Trucks cannot start at that time. Ask for another time.'
                  : 'That is not a valid time. Ask again.'
            );
          } else {
            s.when = { mode: 'schedule', ...input };
            applied.time = check.date.toISOString();
          }
        }
      } else errors.push('when_mode must be "now" or "schedule".');
    }

    if (typeof args.labour_needed === 'boolean') {
      s.labourNeeded = args.labour_needed;
      applied.labour_needed = args.labour_needed;
    }
    if (typeof args.notes === 'string' && args.notes.trim()) {
      s.notes = args.notes.trim().slice(0, 500);
      applied.notes = true;
    }
    return this.snapshot({ ok: errors.length === 0, applied, errors });
  }

  private useSaved(args: Record<string, unknown>) {
    const r = role(args.role);
    if (!r) return { ok: false, error: 'role must be pickup or drop.', ...this.snapshot() };
    const found = this.deps.saved.find((x) => x.id === args.site_id);
    if (!found || !found.site.coords) return { ok: false, error: 'No saved place has that id. Do not guess: call request_map_pick instead.', ...this.snapshot() };
    this.state[r === 'pickup' ? 'pickup' : 'drop'] = { ...found.site, source: 'saved' };
    if (this.awaiting === r) this.awaiting = null;
    return this.snapshot({ ok: true, applied: { [`${r}_location`]: 'saved place' } });
  }

  private requestMap(args: Record<string, unknown>): ToolResult {
    const r = role(args.role);
    if (!r) return { response: { ok: false, error: 'role must be pickup or drop.' }, effect: null };
    this.awaiting = r;
    return {
      response: this.snapshot({ ok: true, status: 'map_opened', note: `The map is open. Tell the customer to choose the ${r} location on it and tap the button when done, then stop and wait. Do not describe any place.` }),
      effect: { type: 'map', role: r },
    };
  }

  private finish(): ToolResult {
    const missing = this.missing();
    if (missing.length > 0) {
      return { response: this.snapshot({ ok: false, error: 'Not everything is known yet. Ask the customer for the first missing item.' }), effect: null };
    }
    const needsPass = Boolean(this.item()?.transitPass);
    return {
      response: this.snapshot({ ok: true, note: needsPass ? 'Tell the customer to check the summary; for this material they will first add the mineral transit pass.' : 'Tell the customer to check the summary and confirm.' }),
      effect: { type: 'finish', needsPass },
    };
  }

  /** The customer picked a point on the map. Returns the app note to send the model. */
  siteChosen(which: Role, site: AgentSite) {
    this.state[which === 'pickup' ? 'pickup' : 'drop'] = site;
    if (this.awaiting === which) this.awaiting = null;
    return `[app] The customer chose the ${which} location on the map. Still missing: ${this.missing().join(', ') || 'nothing'}. Continue.`;
  }

  /** The map was closed without a choice. */
  mapClosed(which: Role) {
    if (this.awaiting === which) this.awaiting = null;
    return `[app] The map was closed without choosing the ${which} location. Ask whether they want to pick it again.`;
  }
}

/** Share of Malayalam-script letters among all letters in a transcript, or null with too little text. */
export function detectLanguage(text: string): 'ml' | 'en' | null {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 3) return null;
  const malayalam = letters.filter((ch) => /[ഀ-ൿ]/.test(ch)).length;
  if (malayalam / letters.length > 0.3) return 'ml';
  const latin = letters.filter((ch) => /[A-Za-z]/.test(ch)).length;
  return latin / letters.length > 0.8 ? 'en' : null;
}

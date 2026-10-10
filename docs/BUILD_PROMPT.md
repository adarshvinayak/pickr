# BUILD PROMPT — PICKR MVP

> **How to use this:** place `AGENTS.md`, `BUSINESS_RULES.md`, `DESIGN_SYSTEM.md`, `DATA_MODEL.md` and `PRD.md` in your project root alongside this file, then paste everything below the line into Antigravity's Agent Manager as your opening task. Work in Planning mode for Phase 0, then Fast mode.

---

You are building **PICKR**, a construction-materials freight booking app for Kochi, Kerala.

Four companion files sit in the project root and are **binding specifications**. Read all four before writing any code, and re-read `BUSINESS_RULES.md` before touching pricing, vehicle selection, or status transitions:

- `AGENTS.md` — standing rules, stack, conventions, guardrails
- `BUSINESS_RULES.md` — catalogues, rate card, algorithms, status machine, voice contract
- `DESIGN_SYSTEM.md` — colours, type, icons, screens, copy rules
- `DATA_MODEL.md` — schema, API contract, realtime, simulator
- `PRD.md` — scope and the acceptance demo script

**Never invent a rate, capacity, unit, status, or colour.** If something is genuinely unspecified, stop and ask rather than guessing.

---

## What you're building

Two surfaces in a single Next.js 15 app:

**`/` — the customer app.** A site supervisor or contractor books a lorry to move construction material. Voice-first with a complete manual fallback, transparent itemised pricing, and live tracking.

**`/driver` — a plain test harness.** A driver selector (no login), an availability switch, incoming job cards with accept/decline, and a status-advance button. Its only job is to prove that bookings reach drivers and that driver actions propagate back to the customer in realtime. Do not spend design effort here.

The users are often not fluent readers of English and are working outdoors with dusty hands on cheap Android phones. Every interface decision follows from that.

---

## Stack — fixed

Next.js 15 App Router · React 19 · TypeScript strict · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Realtime) · Mapbox (`react-map-gl`, Geocoding, Directions — all proxied server-side) · Zod · react-hook-form · Zustand · lucide-react · motion · date-fns · Vitest. Deploy target Vercel.

---

## The ten rules that matter most

1. **LLM for language, code for money and physics.** The model parses speech into slots. Deterministic TypeScript picks the vehicle and computes every rupee.
2. **Kilograms never appear as a user input.** Trade units only — bags, units, loads, nos, boxes, bundles.
3. **Payment comes after driver acceptance, never before.** Cash on delivery is the default.
4. **Every voice question renders simultaneously as tappable chips.** A user must be able to complete a whole booking without speaking.
5. **No minimum lead time.** `Now` is always available; scheduling is an explicit choice.
6. **Status is forward-only**, validated server-side, rejected with `409` if out of order.
7. **Driver acceptance is atomic** — conditional UPDATE, first writer wins, everyone else gets `409 ALREADY_TAKEN`.
8. **One accent colour** (`#F25C05`). No gradients, no dark mode, no emoji in the UI.
9. **56px minimum tap targets, 13px minimum font size, one primary action per screen.**
10. **Realtime, not polling.** Supabase subscriptions drive every cross-surface update.

---

## Build in phases. Verify each before moving on.

### Phase 0 — Plan
Produce an implementation plan covering file structure, the eight vehicle and sixteen material seed records, the pricing module's public API, and the realtime topology. Show it before writing code.

### Phase 1 — Foundation
Scaffold the app. Install the stack. Write `src/config/{vehicles,materials,pricing,statuses}.ts` transcribed exactly from `BUSINESS_RULES.md`. Create the Supabase schema from `DATA_MODEL.md` as a SQL migration plus a seed script (8 vehicles, 16 materials, 12 Kochi drivers with `KL 07`/`KL 40` numbers, 4 saved sites).

Implement and unit-test the three files that carry all the business risk:
- `src/lib/vehicle-select.ts` — assert all six worked examples in `BUSINESS_RULES.md` §3
- `src/lib/pricing.ts` — assert the sanity check in §4.2 (`tipper_100` at 10 km ≈ ₹1,588)
- `src/lib/status.ts` — assert every invalid transition is rejected

**Do not proceed until these tests pass.**

### Phase 2 — Design system
Tailwind v4 theme from `DESIGN_SYSTEM.md` tokens. shadcn components installed and restyled to those tokens. Build `VehicleIcon.tsx` with **eight visually distinct side-profile silhouettes** (differentiated by axle count and body shape — a tipper's raised angled body must be unmistakable against a closed container) and `MaterialIcon.tsx` with sixteen glyphs. Render both full sets on a scratch page and check they're distinguishable at 32px before continuing.

### Phase 3 — Manual booking, end to end
Build the whole booking path without voice first, because voice is a layer on top of it:
home → material picker → quantity (in native units, with a stepper) → pickup/drop (saved sites + Mapbox geocode search + map pin) → time (`Now` / `In 2 hours` / custom) → site access question when the selected vehicle exceeds 2,500 kg → vehicle grid → review with itemised breakdown, labour toggle, optional transit-pass field, payment method → confirm.

Server routes: `/api/catalogue`, `/api/geocode`, `/api/route`, `/api/quote`, `POST /api/bookings`.

### Phase 4 — Driver harness and realtime
Build `/driver`: driver selector, availability switch, job cards, accept/decline, status-advance button, cancel. Implement the broadcast ladder (5 km → 10 km at 45s → 20 km at 90s → `NO_DRIVERS` at 180s) as a tick route called by the client and by Vercel Cron. Wire Supabase Realtime both directions.

**Checkpoint:** two browser windows, book on one, accept on the other, see the customer update within 2 seconds.

### Phase 5 — Tracking
`/trip/[id]`: Mapbox map with route polyline and animated lorry marker, the **Trip Ladder** signature element (six rungs, current rung in 34px display type with a pulsing halo), ETA, driver card, call button, cancel and reschedule with the rules from `BUSINESS_RULES.md` §5.2–5.3. Implement the position simulator described in `DATA_MODEL.md` §5, with a `?real=1` flag for real geolocation.

### Phase 6 — Voice
Web Speech API (`en-IN`) plus Web Speech Synthesis. `POST /api/voice/parse` sends the transcript and current slots to the LLM and returns **only** the JSON contract in `BUSINESS_RULES.md` §6.4. Build the voice bottom sheet: live transcript, filled-slot summary chips, one question at a time, answer chips under every question, `Type instead` link, auto-fallback to the manual picker after two failed recognitions on the same slot.

Implement the example conversation in §6.3 as a working path.

### Phase 7 — Completion and polish
Proof of delivery (photo upload to Supabase Storage + 4-digit OTP), receipt, trip history with `Book again`, repeat tiles on home, empty states, error states, loading skeletons. Then run the full 16-step demo script in `PRD.md` §4 and fix whatever breaks.

---

## Deliverables

A running app (`npm run dev` with `.env.local`), the SQL migration and seed script, passing Vitest suites for the three core modules, and a `README.md` with setup steps and the required environment variables.

---

## Definition of done

The 16-step demo script in `PRD.md` §4 runs end to end in two browser windows without intervention. `npm run build` and `npm run lint` are clean. The app is usable at 360px width. No rupee value is hardcoded outside `src/config/`.

---

## Before you finish, self-check

- Are all eight vehicle icons genuinely distinguishable at 32px, or did you reuse a generic truck?
- Can a user complete a booking by tapping only, never speaking?
- Does the LLM ever produce a price, a distance, or a vehicle id? It must not.
- Does payment happen before acceptance anywhere? It must not.
- Does any screen have two primary buttons?
- Does any user-facing field ask for kilograms?

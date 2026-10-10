# AGENTS.md — PICKR

> The sections below describe the original demo. The user's real-device pilot instructions supersede its simulated data, driver dropdown, authentication, routes and fixed-schema constraints. For current implementation scope read `IMPLEMENTATION_PLAN.md`, `BUILD_REPORT.md` and the root README. Keep the catalogue/rate rules unless explicitly changed by the user. The user has selected Mappls in place of Mapbox. MAPPLS_REST_KEY is server-only; MAPPLS_WEB_KEY is intentionally browser-visible and must be domain restricted. See MAPPLS_SETUP.md.

Standing instructions for every agent working in this workspace. Read this before writing any code, and re-read `BUSINESS_RULES.md` before touching anything that involves money, vehicle selection, or status transitions.

---

## Project

PICKR is a construction-materials freight booking app for Kerala, India. Two surfaces in one Next.js app:
- **`/`** — the customer app (builders, contractors, site supervisors). Voice-first booking with a full manual fallback.
- **`/driver`** — a deliberately plain test harness so we can verify that a booking reaches a driver and that accept/decline/status changes propagate back to the customer in realtime.

There is **no authentication in MVP.** Customers are identified by a `session_id` UUID in `localStorage`. Drivers are picked from a dropdown on `/driver`.

---

## Source of truth — read these, don't improvise

| File | Contains | You must not deviate |
|---|---|---|
| `BUSINESS_RULES.md` | Vehicle & material catalogues, pricing formula and rate card, vehicle-selection algorithm, status machine, cancellation & reschedule rules, voice slot-filling contract | **Never invent a rate, capacity, status, or unit.** |
| `DESIGN_SYSTEM.md` | Colours, type, spacing, icons, screen inventory, copy rules | **One accent colour only.** |
| `DATA_MODEL.md` | Postgres schema, API contract, broadcast worker, position simulator | Schema is fixed; extend only by adding columns. |
| `PRD.md` | Scope, user stories, acceptance criteria | Anything not listed is out of scope. |

If any of these conflict with each other, `BUSINESS_RULES.md` wins. If something is genuinely unspecified, **stop and ask** — do not guess a number.

---

## Tech stack — fixed, do not substitute

- **Next.js 15** (App Router), **React 19**, **TypeScript 5** strict mode
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **Supabase** — Postgres + Realtime. Use `@supabase/supabase-js`. Server routes use the service-role key; the browser uses the anon key.
- **Mapbox** — `mapbox-gl` + `react-map-gl` for maps; Mapbox Geocoding and Directions APIs, proxied through our own API routes so the token stays server-side
- **Zod** for every API boundary; **react-hook-form** for forms
- **Zustand** for the booking draft
- **`lucide-react`** for UI icons; custom SVG components for vehicles and materials
- **`motion`** for the two animations we actually need
- **`date-fns`**, `Intl.NumberFormat('en-IN')`

Deployment target: Vercel. Everything must run with `npm run dev` and a `.env.local`.

---

## Hard rules

1. **LLM for language, code for money and physics.** The model parses what the user said. Vehicle selection, distance, and every rupee are computed by deterministic TypeScript in `src/lib/pricing.ts` and `src/lib/vehicle-select.ts`. Never let a model produce a price or pick a truck.
2. **Never show kilograms as a user input.** Users choose trade units — bags, units, loads, nos, boxes, bundles. Convert internally.
3. **Payment comes after driver acceptance.** Never before. Cash on delivery is the default option.
4. **Every voice question must also render as tappable chips.** A user must be able to complete an entire booking without speaking a word.
5. **Status transitions are forward-only and validated server-side.** Reject out-of-order requests with `409`.
6. **Driver acceptance is atomic.** Conditional `UPDATE ... WHERE status='SEARCHING' AND driver_id IS NULL`. First writer wins; everyone else gets `409 ALREADY_TAKEN`.
7. **No secrets in client code.** Mapbox and LLM keys are server-only. Prefix nothing with `NEXT_PUBLIC_` except the Supabase URL and anon key.
8. **No dark mode.** No gradients. No emoji in the UI.
9. **Minimum tap target 56px. Minimum font size 13px.** This app is used outdoors by people with dusty hands.
10. **Currency is always integer rupees**, formatted with Indian digit grouping.

---

## Code conventions

```
src/
  app/
    (user)/            page.tsx, book/*, trip/[id]/*, trips/
    driver/            page.tsx
    api/               catalogue, voice/parse, geocode, route, quote,
                       bookings/*, driver/*
  components/
    ui/                shadcn primitives
    icons/             VehicleIcon.tsx, MaterialIcon.tsx
    booking/           VoiceSheet, SlotChips, VehicleCard, PriceBreakdown
    trip/              TripLadder, TripMap, DriverCard
  lib/
    supabase/          client.ts, server.ts
    pricing.ts         quote calculation — pure functions, unit tested
    vehicle-select.ts  deterministic selection — pure, unit tested
    status.ts          transition validation
    mapbox.ts          geocode + directions wrappers
    format.ts          currency, distance, duration
  config/
    vehicles.ts  materials.ts  pricing.ts  statuses.ts
  store/
    booking.ts         zustand draft
  types/
    index.ts           shared types, derived from Zod schemas
```

- Files under 300 lines. Functions under 50. Cyclomatic complexity under 10.
- Every exported function has a return type annotation. `any` is banned; use `unknown` and narrow.
- Server components by default; `'use client'` only where interaction demands it.
- Colocate Zod schemas with the route that uses them; export the inferred type.
- Components receive data as props — no data fetching inside presentational components.

---

## Testing

- **Vitest** unit tests are mandatory for `pricing.ts`, `vehicle-select.ts`, and `status.ts`. These three files carry all the business risk.
- Assert the six worked examples in `BUSINESS_RULES.md` §3 as explicit test cases.
- Assert the pricing sanity check in §4.2 (`tipper_100` at 10 km ≈ ₹1,588).
- Assert that every invalid status transition is rejected.
- No E2E framework required for MVP.

---

## Safety guardrails — confirm with the human before

- Changing any rate, capacity, or multiplier in `src/config/`
- Adding a dependency not listed in the stack above
- Modifying the database schema (adding columns is fine; renaming or dropping is not)
- Introducing authentication, real payment processing, or SMS/push providers
- Deploying to production

---

## Definition of done for any task

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run lint` clean
- [ ] Relevant Vitest suites pass
- [ ] Works at 360px viewport width
- [ ] Keyboard focus is visible on every interactive element
- [ ] No hardcoded rupee values outside `src/config/`
- [ ] No console errors on the happy path

---

## Common mistakes to avoid

- Using lucide's generic `Truck` icon for all eight vehicle classes. They must be visually distinct silhouettes.
- Letting the LLM return a price, a vehicle id, or a distance.
- Building a modal where the design calls for a bottom sheet.
- Adding a second primary button to a screen.
- Writing `Distance: 18.2 kilometres` instead of `18.2 km · 45 min`.
- Forgetting that the driver page needs a driver selector, because there is no login.
- Polling where Supabase Realtime should be subscribed.

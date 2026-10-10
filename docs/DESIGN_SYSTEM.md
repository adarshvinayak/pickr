# DESIGN_SYSTEM.md — PICKR

**Design brief:** A booking tool used one-handed, outdoors, in bright sun, on a cheap Android phone, by a site supervisor with cement dust on his fingers who may not read English fluently. Every decision below serves that person.

**Design thesis:** *Nothing on screen that a mason can't understand at arm's length in sunlight.* Big type, one colour that means "act", icons that carry meaning independently of the label, and never more than one primary action per screen.

---

## 1. Colour

Exactly **one** accent. Two neutrals plus a full grey ramp. One semantic green used only for completion ticks, one amber used only for in-progress. No gradients anywhere. No decorative colour.

```css
/* Accent — the only colour that means "do something" */
--pickr-orange:      #F25C05;   /* primary actions, active states, live tracking */
--pickr-orange-dark: #D14D02;   /* pressed */
--pickr-orange-tint: #FFF1E9;   /* selected card fill, chip fill */

/* Neutrals */
--ink:        #16181D;   /* primary text, headings */
--slate:      #6B7280;   /* secondary text, labels */
--line:       #E5E7EB;   /* borders, dividers */
--cloud:      #F6F7F8;   /* page background, inactive card fill */
--white:      #FFFFFF;   /* surfaces */

/* Semantic — used sparingly, never decoratively */
--go:         #0E9F6E;   /* completed step tick only */
--wait:       #B45309;   /* in-progress step only */
--stop:       #DC2626;   /* cancel / destructive only */
```

**Rules**
- Orange is reserved for actionable things. If it isn't tappable or isn't live, it isn't orange.
- Never orange text on white below 16px — use ink.
- Body text is always `--ink` at minimum 16px. Never grey body copy.
- Page background `--cloud`, cards `--white`. That contrast is the only "depth" — no shadows deeper than `0 1px 3px rgba(0,0,0,.06)`.
- No dark mode in MVP.

---

## 2. Type

```
Display / headings : "Bricolage Grotesque" 600/700  — condensed, slightly industrial, high legibility at large sizes
Body / UI          : "Inter" 400/500/600            — best-in-class small-size legibility, full Malayalam-ready fallback later
Numerals (prices)  : Inter, font-variant-numeric: tabular-nums
```

Load both from Google Fonts via `next/font`. Bricolage Grotesque is used *only* for the status word on the tracking screen, screen titles, and the price total — nowhere else. Everything else is Inter.

**Scale** (mobile-first, rem)
| Token | Size | Weight | Use |
|---|---|---|---|
| `display` | 34px | 700 | Live status word ("On the way") |
| `title` | 24px | 600 | Screen titles |
| `price` | 28px | 700 tabular | Total fare |
| `body-lg` | 18px | 500 | Card primary text, button labels |
| `body` | 16px | 400 | Default |
| `label` | 14px | 500 | Field labels, chips |
| `caption` | 13px | 400 | Helper text, only for genuinely secondary info |

Nothing below 13px, ever. Line height 1.4 for body, 1.15 for display.

---

## 3. Layout & touch

- **Mobile-first, max content width 480px, centred on desktop** with `--cloud` gutters. This is a phone app that happens to run in a browser.
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48. Nothing else.
- **Radius:** 12px cards, 14px buttons, 999px chips. Consistent, slightly soft, never sharp.
- **Minimum tap target 56px height.** Primary buttons are 60px, full-width, fixed to the bottom of the viewport with a safe-area inset.
- **One primary action per screen.** If a screen seems to need two, the second is a text link, not a button.
- **Bottom sheet over modal**, always — reachable with a thumb.

---

## 4. Iconography

Base set: **`lucide-react`** for UI chrome (arrows, phone, clock, check, x, map-pin, mic).

**Vehicles and materials get custom SVGs.** Do not use lucide's generic truck icon for all eight vehicles — the whole point is that a user recognises his lorry by silhouette. Build them as a single sprite component:

```
src/components/icons/VehicleIcon.tsx   // 8 distinct side-profile silhouettes
src/components/icons/MaterialIcon.tsx  // 16 material glyphs
```

**Vehicle silhouettes** — 2px stroke, `currentColor`, 48×32 viewBox, differentiated by proportion so they read at a glance:
| key | Silhouette cue |
|---|---|
| `auto` | Three wheels, small cab, tiny tray |
| `ace` | Two axles, cab ≈ tray length |
| `pickup` | Two axles, long cab, low open tray |
| `lcv` | Two axles, tall box tray, cab shorter than tray |
| `container` | Two axles, fully enclosed tall box |
| `tipper_small` | Two axles, angled/raised tipping body |
| `tipper_medium` | Three axles, angled tipping body |
| `tipper_large` | Four axles, long angled tipping body |

**Material glyphs** — filled, single colour: `sand` (cone of grains), `aggregate` (three angular stones), `soil` (mound), `debris` (broken slab + rubble), `cement` (sack with band), `steel` (bundle of rods, end-on), `brick` (stacked bricks), `block` (hollow block, two voids), `tiles` (fanned squares), `pipes` (three circles, end-on), `wood` (stacked planks), `mixed` (three mixed shapes).

Every material chip and every vehicle card must show its icon. Icon-only is never acceptable — always icon + label, because icons are ambiguous and labels are slow, and this user needs both.

---

## 5. Signature element — the Trip Ladder

The one memorable thing in the app. On the tracking screen, the six statuses are a **vertical ladder of six rungs down the left edge**, each rung a 12px dot connected by a 2px rail:

- Completed rungs: filled `--go`, with a tick.
- Current rung: filled `--pickr-orange`, with a soft pulsing halo (respects `prefers-reduced-motion`), and its label set in `display` type — **34px, the largest text on screen.**
- Future rungs: `--line` hollow, label in `--slate`.

The current status is legible from a metre away. This is deliberate: the user is holding the phone up to show his foreman.

Above the ladder: the map with the animated lorry marker. Below: ETA, driver name + vehicle number, and one full-width `Call driver` button.

---

## 6. Motion

Restrained. Three uses only:
1. **Status advance** — the ladder rung fills with a 300ms ease-out, and the new label cross-fades up 8px.
2. **Lorry marker** — interpolates smoothly along the route polyline; never teleports.
3. **Mic listening** — a single concentric ring breathing at 1.2s. Nothing else moves while listening.

All motion respects `prefers-reduced-motion: reduce`.

---

## 7. Voice UI specification

**Home screen hierarchy (top to bottom):**
1. Greeting + saved-site strip (`Kakkanad Site ▾`)
2. **Repeat tiles** — up to 3 cards from booking history: material icon + "1 unit M-Sand → Kakkanad" + "Book again". *(Per strategy doc §4.1, these rank above voice.)*
3. **The mic** — a 96px circular orange button, label beneath: *"Tap and tell us what you need"*.
4. **Book manually** — full-width secondary button.

**Listening state (bottom sheet, 70% height):**
- Live transcript in `body-lg`, ink.
- **Filled-slot summary strip** at the top: `✓ M-Sand  ✓ 1 unit  ✓ Tipper Lorry` — chips in `--pickr-orange-tint`.
- The current question in `title` type.
- **Answer chips** below the question, always — minimum 44px tall, horizontally scrollable.
- Mic button stays visible at the bottom; a `Type instead` link sits beside it.

**Non-negotiable:** the user must be able to complete the entire order by tapping chips alone, never speaking. Voice is an accelerator, not a dependency.

---

## 8. Screen inventory

**User (`/`)**
| Route | Purpose |
|---|---|
| `/` | Home — saved sites, repeat tiles, mic, manual entry |
| `/book/voice` | Conversational intake (bottom sheet over home) |
| `/book/manual` | Stepped manual form: material → quantity → locations → time → options |
| `/book/vehicles` | Vehicle grid — cards with icon, name, local name, capacity, price, ETA |
| `/book/review` | Itemised price breakdown, labour toggle, transit pass, payment method |
| `/book/searching` | Broadcast animation, radius widening, cancel |
| `/trip/[id]` | Tracking — map, Trip Ladder, driver card, call, cancel/reschedule |
| `/trip/[id]/done` | Receipt, POD photo, rate driver |
| `/trips` | History with repeat action |

**Driver (`/driver`)** — deliberately plain test harness
| Route | Purpose |
|---|---|
| `/driver` | Driver selector, availability switch, incoming job cards, active trip |

Driver job card shows: material icon + quantity, vehicle class, pickup → drop with distance, scheduled time, labour required flag, transit pass if present, **earning amount**, and `Accept` / `Decline`. Active trip shows one big status-advance button that walks the ladder, plus `Cancel trip`.

---

## 9. Copy rules

- Sentence case everywhere. Never Title Case, never ALL CAPS except the status word.
- Buttons name the outcome: `Confirm booking`, not `Submit`. The resulting toast uses the same verb: `Booking confirmed`.
- Numbers before words: `18.2 km · 45 min` not `Distance: 18.2 kilometres`.
- Errors state what to do: *"No lorry available near Perumbavoor right now. Try again or schedule for later."* Never *"Something went wrong."*
- Empty states are invitations: *"No trips yet. Tap the mic and tell us what you need moved."*
- Never use the words *optimise*, *seamless*, *leverage*, *platform*, or *solution* in the UI.

---

## 10. Libraries — use these, don't rebuild

| Need | Library |
|---|---|
| Components | `shadcn/ui` (Radix) — button, sheet, dialog, input, select, switch, toast |
| Styling | Tailwind CSS v4 with the tokens above as CSS variables |
| Icons | `lucide-react` + custom vehicle/material SVG sprite |
| Maps | `react-map-gl` + `mapbox-gl` |
| Animation | `motion` (framer-motion) — ladder and marker only |
| Forms | `react-hook-form` + `zod` |
| State | `zustand` (booking draft), TanStack Query optional |
| Dates | `date-fns` |
| Currency | `Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:0})` |
| Voice in | Web Speech API (`SpeechRecognition`), `en-IN` locale |
| Voice out | Web Speech Synthesis, `en-IN` |

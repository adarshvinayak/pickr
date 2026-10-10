# PICKR — Implementation & Verification Walkthrough

## 🚚 Overview

**PICKR** is a construction-materials freight booking application built specifically for the Kerala construction supply chain (Kochi, Ernakulam, Aluva, Perumbavoor, Kakkanad). It delivers a voice-first customer booking experience, transparent itemised pricing, live tracking with the signature 6-rung Trip Ladder, and a complete driver test harness for field dispatch simulation.

All features are implemented strictly to the specifications in `/docs`:
- `BUILD_PROMPT.md`
- `BUSINESS_RULES.md`
- `DESIGN_SYSTEM.md`
- `DATA_MODEL.md`
- `AGENTS.md`
- `PRD.md`

---

## 🏗 Architecture & Core Components

### 1. Business Logic & Physics Engine
- **`src/config/vehicles.ts`**: Transcribed all 8 Kerala market vehicles (`auto`, `ace`, `pickup`, `lcv`, `container`, `tipper_small`, `tipper_medium`, `tipper_large`) with Kerala dimensions, payload ratings, labour charges, and access constraints.
- **`src/config/materials.ts`**: Transcribed all 16 construction materials with Kerala trade units (`unit/100 CFT`, `bag`, `load`, `nos`, `box`, `bundle`, `kg`), self-tipping flags, moisture sensitivity, and minor mineral transit pass requirements.
- **`src/lib/vehicle-select.ts`**: Deterministic selection algorithm factoring material weight, density, volume, tipping needs, and narrow lane access.
- **`src/lib/pricing.ts`**: Transparent itemised pricing engine computing Base Fare, Distance Rate, Labour, Night/Peak/Express Surge Multipliers, Platform Fee (8%), and GST (5%).
- **`src/lib/status.ts`**: Strictly forward-only status state machine enforcing atomic acceptance, cancellation rules, and reschedule policies.

### 2. Design System & Custom SVG Sprites
- **Single Accent Color**: `#F25C05` (Signal Orange), strict light mode, no emojis, no gradients.
- **Typography**: Google Fonts `Bricolage Grotesque` (bold display numbers and active ladder statuses) + `Inter` (UI body).
- **Custom Sprites**:
  - `src/components/icons/VehicleIcon.tsx`: 8 distinct vehicle silhouettes at `48x32` viewBox.
  - `src/components/icons/MaterialIcon.tsx`: 16 high-contrast material glyphs.
- **Micro-interactions**: Pulse halo animations (`pulse-halo`), 56px touch targets, sticky bottom action bars.

### 3. Customer Application Pages
- **`/` (Home)**: Greeting, saved site selector strip (`Kakkanad Site ▾`), top 3 repeat booking tiles, prominent 96px orange mic button, and full-width "Book manually" action.
- **`/book`**: Stepped manual booking wizard covering material category selection, native trade unit steppers, site access restrictions, and scheduling.
- **`/book/vehicles`**: Vehicle recommendation card with rationale (*"Tipper Lorry — right size for 1 unit of M-Sand"*) and manual upgrade picker.
- **`/book/review`**: Transparent price breakdown, labour toggle for non-tipping materials, KOMPAS mineral transit pass field, and default Cash on Delivery (COD) / Online payment selector.
- **`/book/searching`**: Concentric radar wave animation widening from 5 km -> 10 km -> 20 km with real-time SSE listener automatically transitioning to trip tracking on driver acceptance.
- **`/trip/[id]`**: Live tracking screen with interactive SVG route map, the signature **6-Rung Trip Ladder** (34px active display state), driver card with masked calling, and cancel/reschedule actions.
- **`/trip/[id]/done`**: Delivery completed receipt showing POD site photo, driver rating stars (1–5), itemised summary, and `Book again` repeat action.
- **`/trips`**: Session trip history list with quick re-booking.

### 4. Driver Test Harness (`/driver`)
- **Driver Selector**: Switch seamlessly between 12 seeded Kochi drivers across all 8 vehicle classes with no login barrier.
- **Availability Toggle**: Real-time online/offline switch.
- **Incoming Broadcast Cards**: Shows route, load, transit pass, and driver earnings.
- **Atomic Acceptance**: First-wins concurrency; competing drivers receive `409 ALREADY_TAKEN`.
- **One Big Status Button**: Advances the 6 ladder steps (`Go to pickup` -> `Confirm loading` -> `Start trip` -> `Reached drop point` -> `Confirm unload`).
- **Proof of Delivery (POD)**: Site unload camera capture + 4-digit customer OTP verification.
- **Live Position Streamer**: Smoothly interpolates coordinates along route to customer in realtime (supports `?real=1` for geolocation).

---

## 🧪 Verification & Test Results

### 1. Vitest Unit Test Suite
Ran `vitest run` on all 3 test suites:
- **`tests/vehicle-select.test.ts`**: 7/7 passed (All 6 PRD worked examples + multi-trip splits).
- **`tests/pricing.test.ts`**: 6/6 passed (Worked examples, §4.2 tipper_100 ₹1,588 check, peak surge, night surge, labour, distance tiers).
- **`tests/status.test.ts`**: 8/8 passed (Forward progression, rejection of invalid rollbacks, cancellation fee policies, reschedule checks).
- **Total**: 21 / 21 tests passed (100%).

### 2. Next.js Production Build
Ran `next build`:
- Clean compilation with 0 type errors across all 24 static and dynamic routes.

### 3. Automated End-to-End Acceptance Script (PRD §4)
Executed full programmatic E2E script simulating customer & driver interaction:
```
✓ STEP 1: CATALOGUE -> 8 Vehicles, 16 Materials
✓ STEP 2: VOICE PARSER -> Extracted { material: 'm_sand', quantity: 1, unit: 'unit', pickup: 'Perumbavoor Quarry', drop: 'Kakkanad Site', when: 'now' }
✓ STEP 3: QUOTE -> Recommended Tipper Lorry (tipper_100), Total Fare calculated
✓ STEP 4: CREATE BOOKING -> Created LR-7004, Status SEARCHING, OTP 2014
✓ STEP 5: DRIVER BROADCAST -> Driver Ratheesh Kumar received broadcast
✓ STEP 6: DRIVER ACCEPTS JOB -> Status 200, Status -> ACCEPTED
✓ STEP 6B: SECOND DRIVER ACCEPTS -> Status 409 Conflict (ALREADY_TAKEN)
✓ STEP 7: DRIVER ADVANCES LADDER -> AT_PICKUP -> LOADED -> IN_TRANSIT -> AT_DROP
✓ STEP 8: CONFIRM UNLOAD WITH OTP -> Status COMPLETED, completedAt timestamp saved
```

---

## 🚀 Running the App

```bash
# 1. Install dependencies
npm install

# 2. Run test suite
npm test

# 3. Start local development server
npm run dev
```

- **Customer App**: Open [http://localhost:3000](http://localhost:3000)
- **Driver Harness**: Open [http://localhost:3000/driver](http://localhost:3000/driver)
- **Icon Sprint Review**: Open [http://localhost:3000/scratch/icons](http://localhost:3000/scratch/icons)

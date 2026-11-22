# PICKR repository comparison

Reviewed 18 November 2026.

## Repositories and scope

- Current application: `/Users/equipp/Documents/Project Lorry`, remote `elmnt6i-collab/pickr`, HEAD `caced2dc9c34a580efe5d2187938babdd6d431f6`, **including the current uncommitted UI, assets and Android changes**.
- New application: `https://github.com/tilinkkr/pickrapp`, cloned into `/Users/equipp/Documents/Project Lorry/pickrapp-new-build`, branch `main`, HEAD `d052337046873ed2a5cf67cee420f97d75d5b0ab`.
- New repository latest commit: “Calm motion, animated map picker and booking for someone else”.
- This is a source-code comparison, plus an isolated execution of the new fare calculations. No production accounts, bookings, settings or database records were changed. No new APK or full Expo runtime was built/tested in this review. Visual usability and device compatibility therefore remain unverified.

## Main finding

The new build is a **React Native/Expo customer application with a richer customer interface and locally implemented demo flows**. It is not yet a replacement for the current customer + driver + admin + backend system.

The current application contains real server endpoints, Supabase persistence/migrations, server-controlled dispatch and trip transitions, a driver interface, an admin console, Mappls integration and native Android background services. The new application implements customer navigation, local persistence, native map selection and a client-side trip state machine, but creates bookings locally and simulates driver acceptance, travel and load photos.

Recommended direction: use the new app as a candidate customer frontend, connect it to the existing backend through an explicit adapter, and retain the existing driver/admin applications until equivalent working replacements exist. This requires integration work, not copying files over the current app.

## Architecture comparison

| Area | Current app | New build | Implication |
|---|---|---|---|
| UI framework | Next.js/React web interface; Vite-bundled Android WebView UI | Expo Router, React Native and React Native Web | Components are not directly interchangeable |
| Server | Next server API and worker | No booking/server API implementation found in source | Keep or migrate existing backend separately |
| Persistence | Supabase accounts, bookings, drivers, documents, service areas and audit; local drafts | AsyncStorage sessions, trips, favourites and people | New bookings are device-local, not shared across users/drivers |
| Roles | Customer, driver, admin | Customer/guest journeys | Driver/admin operational flows missing from new app |
| Android | Two flavour APKs, native bridge, tracking service, job alerts | Expo source and configuration | No equivalent two-role APK build setup checked in |
| iOS | No delivered iOS target | Cross-platform React Native source and iOS app configuration | Better starting point for an iOS frontend, but no verified iOS release |
| Web maps | Mappls SDK | Illustrated picker; native trip map unavailable on web | Web map functionality regresses |
| Notifications | FCM integration, worker, native alerts/polling | Local notification preference switches | Preferences do not establish delivery |
| Automated tests | 16 existing test suites; previous pass 88 tests | No test/spec files or test script found | New logic needs automated coverage |

New package declarations include Expo ~58, React Native 0.88.1 and React 19.3.0. These are the versions declared by that repository, not a statement that dependency installation/device compatibility was verified. Its `android` script starts Expo for Android; it does not itself generate a standalone signed APK. No EAS build configuration or checked-in native Android/iOS project was found.

## Customer feature matrix

| Feature | Current app | New build |
|---|---|---|
| Name/phone sign-in | Real backend pilot session; no OTP | Phone → OTP → registration UX, but OTP is explicitly stubbed |
| Guest access | Not a separate journey | Guest session supported |
| Customer profile | Name/phone operator-managed | Local email, individual/business, WhatsApp number, profile photo and preferences |
| Manual booking | Six-step flow with separate pickup/delivery | Material → combined route → site/timing → truck → review; conditional pass step |
| Exact site selection | Search/reverse lookup through backend; centre-pin Mappls picker | Real native centre-pin map, OS reverse geocoder; typed text can lack coordinates |
| Place search/autosuggest | Backend place-search integration | Route text fields accept labels; no equivalent provider-backed autosuggest found |
| Recent places | Up to five; saved sites backed by server | Up to six favourites on route screen, ranked pinned/usage/recency; device-local |
| Saved-site management | Add/list sites | Add, edit, remove, pin and usage counts locally |
| Booking for another person | No dedicated structured flow | Name/phone, pickup/drop/both meeting point, who pays, recent people, share text |
| Material catalogue | 16 materials across several trade units | 20 items in four categories, including new aggregates/blocks/filling variants |
| Truck catalogue | Eight categories, server eligibility | Eight similar categories with different IDs; local category/capacity quotes |
| Quote | Route distance, configured rate card, time adjustments, fees/tax | Per-load demo rates, estimated loads and demo fare split |
| Schedule | Seven dates, future time, explicit IST | Seven dates; additional school-hour exclusions; local device-time calculations |
| Transit pass | Applicable reminder/number | Additional photo-selection screen; upload progress is simulated/local |
| Voice | Backend parser, browser/native speech paths and manual fallback | Local keyword/number parser plus TTS; speech input currently keyboard microphone |
| Driver search | Server offers, eligibility, expansion and first acceptance | Demo driver accepts after nine seconds |
| Tracking | Driver GPS and navigation refresh through backend | Simulated progress; native map with straight line between sites |
| Trip stages | Server validated | Client state machine mirrors many stages, but no authority across devices |
| Loading/unloading | Server timestamps, photos, waiting and payment | Local timers/photo demo and customer-visible stage UI |
| Cancellation/retry | Server actions, configured fee | Local transitions with similar fee concept |
| Payment | Driver confirms cash/direct UPI | Local demo payment event and customer payment preference screens |
| Receipt/feedback | Backend trip/payment/review records | Customer UI and local data; authority must be connected |
| Customer rating | Customer submits trip feedback | Additional customer-rating display, currently demo-derived |
| Coins/rewards | Not implemented | Demo balance of 20 per paid trip; redemption is future-facing |
| Privacy choices | No equivalent detailed preference journey | Local consent switches/timestamps; erase-request row has no handler |
| Service outage variants | Actual connection/paused/service-area checks | Additional rain/busy/outage UI states controlled by demo store |

### Catalogue differences to resolve

New additions include 6mm Jelly, Quarry Dust, GSB/Wet Mix, Rubble Stone, Laterite Stone, Solid Blocks, Interlock Bricks, AAC Blocks, Red Earth and Gravel. Naming/subdivision also changes for bricks and soil.

The new catalogue omits dedicated Cement, TMT Steel, Tiles, Pipes, Wood/Shuttering and Mixed/Other entries from the existing build. New quantity measures are bulk units, bricks and blocks; the current app additionally supports bags, kilograms, boxes, bundles and loads. Mud/Soil and Debris are treated as bulk units in the new catalogue rather than the existing load unit.

New truck quotes can calculate several loads using `ceil(quantity / capacity)` and multiply a demo per-load price. Existing dispatch assigns one driver/trip; it has no corresponding multiple-load execution workflow. This must not silently become a commercial promise without defining how each load, timer, proof, completion and charge works.

## Existing capabilities missing from the new repository

### Driver operations

No equivalent driver role journey was found for registration, vehicle measurements, four private documents, approval/test access, available/offline controls, live offers, accept/decline, background tracking, external navigation, arrival buttons, proof upload, unloading confirmation, full payment confirmation or release/reassignment. A customer-side simulator performs parts of this progression; that is not a functioning driver app.

### Admin operations

No equivalent admin console was found for live fleet/trip monitoring, manual assignment, driver review/suspension, accounts, boundary drawing/activation, ledger/CSV, settings, road report moderation, audit or health checks. The documentation copied into the new repo describes some of these capabilities, but documentation is not an implementation.

### Backend and operational integration

Missing equivalents include Supabase migrations/persistence, authenticated role sessions, atomic first-driver acceptance, competing-request handling, upload/private-file access, signed quote confirmation, server-side idempotency, server-side search expansion/expiry, shared payment/audit records, push delivery and worker/cron execution.

### Maps/navigation

The current Mappls path provides route/search/reverse-geocode and traffic ETA capabilities subject to configuration and provider entitlement. The new native map uses `react-native-maps`; the trip polyline is a straight segment `[pickup, delivery]`, not a calculated road route. No equivalent traffic ETA, server navigation update or truck-dimension routing integration was found. Do not interpret native map rendering as route/navigation feature parity.

## Important defects and integration risks

### 1. Critical: apparent real bookings are local simulations

`src/app/book/review.tsx` waits 600 ms, calls `addTrip`, and does not submit to the current backend. `src/lib/trip-runner.tsx` automatically accepts searches after nine seconds, ticks travel every three seconds and adds demo photos. `simulate.ts` supplies a fabricated driver, registration and performance statistics.

Remove/strictly isolate these behaviours before real testing. Wire booking, offer, GPS, photo and payment state to server responses. Keep demo mode explicit and unavailable in a real pilot configuration.

### 2. Critical: OTP is not verification

`src/lib/otp.ts` sends no SMS. Any six digits other than `000000` pass verification. A locally stored customer session is not equivalent to an authenticated server identity.

Either retain the existing explicitly unverified pilot sign-in contract or implement real verification and server session issuance. Do not describe the existing stub as secure authentication.

### 3. High: site text can bypass exact-location/service-area requirements

`book/route.tsx` stores typed input as `{label, source:'manual'}` with no coordinates. The readiness condition checks that both site objects exist. Map/GPS paths have geographic checks, but text-only sites cannot be validated against an active server polygon.

Resolve/confirm every site to coordinates before quoting, then validate both sites server-side. Use server active zones instead of `service-area.ts`'s hardcoded outline of Kerala. The current pilot’s actual configured boundaries are narrower/dynamic.

### 4. High: rain surcharge applied twice

Reproduced by executing the new pure fare functions with TypeScript transpilation, without modifying the new source:

- Demo base quote: ₹1,800.
- Review `splitQuote(1800, true)`: ₹1,925.
- Review stores that total as `trip.quote` and also sets `rain: true`.
- Later `tripFare({quote:1925, rain:true, ...})`: ₹2,059.

Use one server-generated itemized quote and avoid reconstructing/reapplying surcharges on the trip screen or completion.

### 5. High: rate-card differences

Current platform fee is 8%; new demo split uses a flat ₹49. Current quotes use route kilometres and vehicle rates; new prices use loads × demo rate. New rain surcharge is not part of the existing approved pricing configuration.

New `waitRate('14ft Lorry')` returns ₹8/min, whereas the current 2,500 kg category receives ₹4/min. Resolve these as business-rule changes, not visual redesign decisions.

### 6. High: locally shared account data

Trips, sites and recent people use global keys (`pickr.trips`, `pickr.sites`, `pickr.people`). Session sign-out only clears session storage, and providers live outside the signed-in screen guard. A subsequent user on the same installation can therefore inherit previous local operational/personal data.

Scope caches to authenticated account IDs, reset provider state on account change and fetch authoritative data from the backend. This also needs explicit guest-to-account migration rules.

### 7. High: new payment-event mapping is incompatible

`trip-machine.ts` maps `PAID` to `PAYMENT_RECEIVED`; the current booking action endpoint accepts `PAY`. The event’s `method` must also map to `collectionMethod`, and payment is separate from work completion in the current database.

Build and test an API adapter rather than using these string mappings as-is. Acceptance likewise belongs to the offers endpoint, not a generic customer stage update.

### 8. Medium: new business restrictions are device-local

`lib/schedule.ts` blocks 08:00–10:00 and 14:30–16:00, including immediate bookings during those windows. The existing backend does not enforce these additional exclusions. Code comments mention agreement dates, but this review does not establish business authorization or applicability across areas.

Confirm policy and move configurable restrictions to the server if retained. It currently uses device-local hours/dates despite describing IST; devices in another time zone will evaluate differently. Current pricing/scheduling explicitly uses Asia/Kolkata in relevant paths.

### 9. Medium: address formatting changes earlier requirements

`geocode.ts` prefers address `name` and includes `streetNumber`; this can reintroduce house/store names and numbers that were previously excluded from normal location labels. Confirm the intended address hierarchy and apply one formatting contract across native and web providers.

### 10. Medium: web parity and feature promises

Native picker maps are real; the web picker is illustrated demo and native trip maps return null on web. Privacy, notification preferences, coins, ratings and WhatsApp choices do not imply an implemented server service. The erase-data row has no action handler. Clearly mark incomplete actions until connected.

## Suggested integration approach

1. Keep both repositories separate. Do not replace the working backend, migrations, driver app or admin console with the new customer app.
2. Establish agreed customer scope: material catalogue, multiple loads, booking for another person, pass upload, schedule restrictions, rewards and OTP policy.
3. Add a customer API layer to the Expo app using the existing endpoints: login/session, public configuration, sites, quote, bookings, snapshot, actions, upload/private-file access, search/reverse lookup and route/navigation data.
4. Define explicit model conversions: underscore versus hyphen vehicle/material IDs; nested `{lat,lng,label,address}` versus `{latitude,longitude}`; ISO timestamps versus revived Date objects; current stage plus payment status versus new combined stages.
5. Replace demo quote, booking, runner, driver/photo/statistics, weather and service-area sources. Server records must own every important state transition.
6. Add backend support for new structured recipient/payer and consent fields before presenting them as persisted operational instructions. Keep private pass images in controlled storage.
7. Implement real web maps/search or retain the current web frontend until parity is ready. Decide the map-provider strategy explicitly.
8. Configure a verified Android build target and package ID, map keys, permissions, signing and notification integration. Retain the existing driver APK until its replacement has equivalent background behaviour.
9. Add contract and device tests before switching real customers: cross-account isolation, quote parity, simultaneous acceptance, duplicate submission, cancelled offers, missed GPS, app restart/background, expired search, scheduled start, load proof, waiting, payment and repeat booking.

## Recommendation

For real pilot operations, the current application remains the functional foundation. The new repository is useful as the next customer frontend and as a source of additional UX ideas. Its local state-machine separation and native platform components are useful groundwork, but should be integrated with the existing system’s server authority and operational roles before live use.

## Evidence map

Paths under `pickrapp-new-build/` refer to the cloned repository.

| Finding | Main source |
|---|---|
| Framework and build scripts | `package.json`, `app.json` |
| Provider lifecycle and simulation mounted | `src/app/_layout.tsx` |
| Stub OTP and local session | `src/lib/otp.ts`, `src/lib/session.tsx` |
| Local booking submission | `src/app/book/review.tsx`, `src/lib/trips.tsx` |
| Simulated acceptance/travel/photos | `src/lib/trip-runner.tsx`, `src/lib/simulate.ts` |
| New trip stages/event mapping | `src/lib/trip-machine.ts` |
| Native/web map difference | `src/components/maps/picker-map.tsx`, `.web.tsx`, `trip-map.tsx`, `.web.tsx` |
| Typed locations and six recent entries | `src/app/book/route.tsx` |
| Device geocoder/address | `src/lib/geocode.ts`, `src/lib/locate.ts` |
| Demo area | `src/lib/service-area.ts` |
| Catalogue and per-load quotes | `src/lib/catalog.ts` |
| Fare/rain and waiting | `src/lib/fare.ts`, `src/app/book/review.tsx` |
| Recipient and sharing | `src/lib/people.ts`, `src/components/booking/for-whom.tsx` |
| Favourite CRUD/pinning | `src/lib/sites.tsx` |
| Preferences/rewards | `src/app/profile/`, `src/lib/rating.ts`, `src/lib/demo-weather.ts` |
| Current server/driver/admin | Parent `src/lib/pilot/`, `src/components/pilot/admin/`, `native/android/`, `supabase/migrations/` |
| Current price rules | Parent `src/config/pricing.ts`, `src/config/vehicles.ts`, `src/lib/pricing.ts` |

# PICKR — complete Google Stitch UI/UX brief

Paste the brief below into Stitch. It describes the proposed design, not a claim that every screen or interaction is implemented. Generate one consistent design system, then customer, driver and admin flows in separate batches. Existing business rules must survive the redesign.

---

Design PICKR, a truck booking and live tracking service for construction materials and construction-site transfers in Kerala, India. Produce two separate mobile apps, PICKR Customer and PICKR Driver, plus a desktop-first PICKR Admin console. Both mobile apps must also work as responsive websites. The pilot operates only within admin-defined service polygons in Thrissur; other cities may be enabled later.

The experience should feel dependable, modern and distinctly PICKR. Take inspiration from the clarity of transport apps such as Porter and Rapido without copying their branding, layouts or assets. Customers must know what truck they are booking, what it costs and what is happening now. Drivers must immediately understand their next action. Operators must see and resolve exceptions quickly.

## Product scope and business rules

- Construction materials and site transfers only. No passenger rides, food delivery, material marketplace or general courier navigation.
- Separate customer and driver apps; web paths `/customer`, `/driver`, `/admin`. Do not include a customer/driver role switch in either installed app.
- Customer and driver pilot sign-in use name and Indian mobile number, without OTP or password. Clearly explain that this is pilot sign-in and the number is not verified. Admin sign-in requires phone and password.
- Driver onboarding selects vehicle class, registration number, vehicle registration document, RC book, driving licence and Aadhaar. Record truck height, width, length, maximum gross vehicle weight including load, and maximum axle load. Do not confuse payload capacity with gross weight.
- A clearly marked test-only skip is available when enabled by admin. Full document submissions require admin approval; test skips receive a separate test status. Do not show a verified badge to a skipped driver.
- Both pickup and destination must lie inside active service polygons. Remote customers are allowed to book transfers between those sites; their phone location need not be within the zone.
- Only eligible, online, free drivers with fresh GPS receive matching vehicle-class requests. First successful acceptance wins. Rejection suppresses that booking for the same search attempt. New attempts may offer it again.
- Search lasts five minutes and expands each minute. Default radius sequence: 5, 10, 15, 20, 25 km. Values are admin-configurable.
- Only one active job per driver and customer. Driver remains reserved after unloading until collection is confirmed.
- Trip stages: searching → accepted / heading to pickup → loading → in transit → unloading → work complete / payment pending → payment collected. Include cancelled and no-driver states.
- Loading and unloading each include 30 free minutes. After free time, show the relevant vehicle's waiting rate and accumulated charge. Timers are elapsed allowances, not mandatory delays before progressing.
- Starting the loaded trip requires at least two load photos, unless the test-only skip is enabled and deliberately selected. The skip must be recorded.
- Collection means driver-confirmed cash or direct UPI. There is no in-app payment gateway, wallet, automatic settlement or platform payout in this pilot.
- Fare covers transport, not the purchase of materials. Estimate pickup arrival separately from pickup-to-drop travel. Quote distance fare stays fixed during route refresh; waiting can change the final amount.
- Mappls supplies maps, search and routing. The pilot currently supports current-traffic ETA on the standard route. Do not promise predictive ETA, fastest routing, measured truck restrictions or comprehensive incident coverage unless these capabilities are enabled and verified later.
- Driver opens external Mappls or Google Maps for turn-by-turn directions. External routing may not apply the truck restrictions recorded in PICKR. Do not design an in-app navigation engine as a launch feature.

## Users and design priorities

Customers: site supervisors, contractors, small builders, material suppliers and homeowners coordinating a site delivery. They may have limited time, weak mobile data and Malayalam as their preferred language.

Drivers: owner-drivers using affordable Android phones outdoors. Use large type, high contrast, large touch targets and minimal reading. Complex setup happens while parked. The active trip screen stays focused on the current task.

Admin: one pilot operator managing drivers, requests, service areas and exceptions. Prefer useful tables and a map beside actionable details over decorative analytics.

Priorities: booking clarity; fast dispatch; trustworthy tracking; visible loading/unloading progress; clear payment confirmation; useful recovery when permissions, network or provider access fail.

## Visual direction

Create a restrained industrial identity: warm white surfaces, charcoal text, a strong orange accent, subtle borders and rounded cards. Avoid an oversized marketing hero, glass effects, excessive gradients, decorative charts and continuous animations.

Proposed tokens:

- Brand orange: `#F25C05`; use for accents, selected states and key illustrations. For small white text on a filled CTA, use a darker accessible orange such as `#B83E00` and verify contrast.
- Main text: `#182126`; secondary text: `#59646B`.
- Background: `#F7F8FA`; surface: `#FFFFFF`; border: `#E2E7EB`.
- Success: `#18794E`; warning: `#8A5A00`; danger: `#B42318`.
- Type: system sans or Inter for English; Noto Sans Malayalam or a suitable system fallback for Malayalam. Avoid loading many weights. Body 16px, labels 14px, main headings 24–28px. Driver primary task text may be 28–32px. Fare/timer digits should align consistently.
- Spacing: 4px base, mainly 8/12/16/24/32px. Card radius about 16px, control radius 10–12px. Subtle shadows only for sheets and floating controls.
- Touch targets at least 48px; driver main actions at least 56px tall. Normal text contrast at least 4.5:1. Never communicate status solely through colour.
- Consistent outline icons with labels. Use differentiated pickup/drop shapes in addition to colour.

Customer UI can feel warmer and more illustrative; driver UI should feel more direct and functional. Both share typography, spacing, status styles and components.

## Low-poly truck visuals

Use a consistent family of low-poly, three-quarter-view truck illustrations on vehicle selection cards: Pickup Auto, Tata Ace, Bolero Pickup, 14ft Lorry, 17ft Closed Body, 1-unit Tipper, 2-unit Tipper and 7-unit Leyland Taurus.

The default asset is a small compressed still render with transparent background. Design an optional inspect/rotate interaction for the selected vehicle as a later enhancement, without making real-time 3D a dependency of booking. All vehicle information and selection must work if images do not load. Do not put animated 3D models on every map marker.

Show the class name, verified/configured payload or volume, body type, price and the reason for recommendation. Vehicle sizes and capacity must come from configuration, not illustration proportions or AI-invented specifications. One bulk-material unit is 100 CFT, not one tonne. Quantity inputs must show the material's actual unit.

## Navigation and responsive layouts

Customer bottom navigation: Home, Trips, Account. Help is accessible on all active-trip screens. Use an active-trip strip to resume work instead of allowing another booking.

Driver bottom navigation: Work, Trips, Account. Collection totals can live within trip history; do not add a wallet or payout tab. Online/offline status stays prominent. Active work takes over the main screen.

Admin sidebar: Operations, Service areas, Drivers, Accounts, Road reports, Trip ledger, Settings, Audit. Labels are proposed navigation groupings for existing capabilities.

Design reference mobile frames at 390×844, verify 360px widths and 200% text scaling, and include 768px tablet and 1440×900 desktop variants. Mobile layouts use full-width content and bottom sheets; desktop booking/tracking uses map and detail panel side by side. Admin tables have usable narrow-screen card alternatives. Respect Android and future iOS safe areas, keyboard space and back behavior. Actions must not rely on hover or swipe alone.

## Customer screen inventory and interactions

C01 — Sign-in. PICKR logo, short value statement, name, +91 mobile field, Continue, pilot notice and language choice. Inline invalid-number and connection-error states. Preserve typed values on failure. No OTP screen.

C02 — Home. Compact greeting and Thrissur service label. Two clear entry choices: “Tell us what to move” with microphone icon and “Book manually.” Saved/recent sites and a resume-trip card when relevant. Do not imply that empty trucks are nearby before live availability is checked. Saved site management and Account screen are proposed extensions where current functionality is limited.

C03 — Manual load details. Material selection, correctly labelled quantity/unit, pickup timing, optional helpers where relevant, narrow access, cargo size/site instructions and transit pass field where required. Organize as a short guided flow with progress, not one long form. Preserve entries when going back.

C04 — Voice assistant. A focused instruction view with language selection, microphone button, listening/processing states, editable transcript, one follow-up question at a time and suggested answer chips. Ask material, amount, sites, timing, helpers and access only when needed. Provide “Type instead” and “Switch to manual.” Summarize interpreted details for confirmation; never submit a booking directly from an uncertain transcript. Request microphone permission only on deliberate use. Avoid a decorative chat feed that obscures current required information.

C05 — Pickup selection. Search field, suggestions with full address, saved sites, Use my location and Choose on map. Search result is followed by entrance confirmation on the map. Show a fixed centre pin, address/coordinate panel, optional landmark/gate note and Confirm pickup. A low-accuracy GPS sample prompts adjustment. Do not silently use a city centre.

C06 — Destination selection. Same interaction and visual structure as pickup, with an unmistakable destination label. Require a separate confirmed site. Show a clear unserviceable-site message when outside the active polygon. Allow changing either site without losing load details.

C07 — Vehicle selection. Recommended suitable class first, concise explanation, low-poly illustrations, capacity/body information, price and alternatives. Distinguish “suitable for this load” from “driver available now.” Include a detail sheet and prevent an incompatible choice. A narrow entrance should trigger appropriate access guidance rather than falsely guaranteeing access.

C08 — Review and request. Pickup and destination, material/quantity, truck class, timing, notes, estimated route travel time, fare breakdown and collection method. Explicit copy: “Transport only. Material cost excluded.” Show 30 free minutes at each end and extra waiting rate. Clearly distinguish estimate, confirmed quote and possible waiting additions. Primary action: Request truck. Include quote-expired, price-changed and retry states without duplicate booking.

C09 — Searching. Booking code, selected truck, site summary, progress indicator, actual radius and five-minute countdown. Example: “Checking drivers within 10 km · 3:42 remaining.” Cancel with reason. No fake vehicle markers, invented matching percentages or made-up drivers. Scheduled bookings show their planned time and begin the countdown only when search begins.

C10 — Driver assigned / heading to pickup. Map, assigned driver and vehicle number, pickup ETA, GPS freshness, Call driver, support and a compact progress timeline. Bottom sheet has collapsed summary, half-height detail and expanded detail states; important actions remain accessible. Route and marker can be displayed only from real data.

C11 — Loading. Status “Driver at pickup,” a visible 30-minute free-loading timer and explanation that the driver confirms departure. Customer sees uploaded load photos once submitted. Show extra waiting clearly when free time expires. Avoid a customer button that changes the driver's stage.

C12 — In transit. Map and route to destination, current arrival estimate, GPS update age, driver/contact controls and trip progress. Pickup ETA must be replaced by destination ETA. Show only a genuine fresh position; stale data remains visibly stale. Keep price and support accessible without covering the map.

C13 — Unloading. Destination arrival, separate free-unloading countdown, waiting-charge explanation and current stage. Do not continue displaying a moving arrival ETA during unloading.

C14 — Completed / collection pending. Final freight breakdown, driver payment instructions and “Pay the driver by cash or direct UPI.” State that the driver confirms collection. Do not show a successful transfer before that record exists. No gateway checkout or generated QR unless separately implemented later.

C15 — Collection confirmed / receipt. Trip code, sites, vehicle, timestamps, freight breakdown, collection method/reference, receipt control and rating/feedback. Say “Collection confirmed by driver” rather than “Payment verified by bank.” Include support and Back to home.

C16 — Trips. Active, scheduled and historical trips with status, code, site names, date and amount. Clear empty state and detail view. Preserve a distinction between cancelled, timed out and completed. Filtering is a proposed UX improvement if not already present.

C17 — Account and help. Name/phone, saved-site management, language preference, pilot support and sign-out where allowed. Editable profile fields are proposed additions; avoid implying phone verification. Sign-out blocked during active work needs an explanation and a link to resume it.

C18 — No driver / cancelled. Plain explanation, retained booking details, retry/search-again, edit request and support. Retry starts a new five-minute attempt, not a resumed expired countdown. Show any cancellation fee before confirmation, from the actual pricing policy.

## Driver screen inventory and interactions

D01 — Sign-in. Same brand, distinctly labelled PICKR Driver. Name, phone, Continue and pilot notice.

D02 — Vehicle setup. Vehicle class with compact illustrations, registration, then routing measurements with units and contextual explanations. Separate load capacity from gross and axle weight. Prevent accidental edits during active work.

D03 — Document onboarding. Step-based checklist for vehicle registration, RC, licence and Aadhaar. Camera/file selection, readable upload preview, uploading, retry and replace. Show pending/approved/rejected states. Include “Skip for pilot testing” only when allowed, visually separated from normal submission.

D04 — Approval and readiness. Explain pending approval or missing requirements and provide support. For eligible test drivers, show “Pilot test driver,” not “Verified.” Permission readiness includes location, notifications, optional overlay and background tracking guidance on Android. Explain each permission before the OS prompt. Show a foreground-only web notice in web mode.

D05 — Work dashboard. Large online/offline control; vehicle class and registration; GPS/network status; availability message. A clear offline empty state. Going online outside the service zone shows an actionable message. Active work prevents offline/vehicle edits and explains why.

D06 — Incoming request. Foreground dialog with material/quantity, pickup/drop names, pickup distance or ETA only when actually available, quoted freight, access notes and Accept/Decline. Make Accept dominant, Decline easy to find. Explicitly state that first acceptance gets the job. No invented 15-second countdown: show only a real server-supplied expiry. Requests that disappear must not leave a blocking blank dialog.

D07 — Notification and optional overlay. Provide designs for new-request heads-up notification, ongoing tracking notification and a compact optional Android overlay with View/Accept/Decline where supported. Overlay is not required to use the service and must not imitate an OS warning. Include “Another driver accepted” and “Request expired” states.

D08 — Heading to pickup. Large next action, pickup address/entrance notes, call customer, ETA/freshness, and Open Mappls / Open Google Maps. Driver can report a road/site issue and release an accepted job with a reason. Show Reached pickup as the stage action; design accidental-tap protection as a concise confirmation, not a gesture-only control.

D09 — Loading. Large timer, load checklist and minimum two-photo requirement. Camera-first upload and file alternative. Show slots 1 and 2, upload status, retry and previews. Departure stays disabled with an explicit reason until evidence is sufficient. Place the test-only photo skip separately with a visible recorded-test label.

D10 — In transit. Destination-focused address and stage action, external navigation shortcuts, call customer, connectivity and GPS freshness. No incoming job offers. Avoid a complex map interaction while driving; ask the driver to stop before photo capture or road reporting.

D11 — Unloading. Large independent timer and Unloading complete action. Show overage in minutes and charge when applicable. Explain that completing unloading still leaves collection pending.

D12 — Collection. Final freight, waiting breakdown, Cash/Direct UPI choice, UPI reference field when relevant, and explicit “Confirm collection” action. Confirmation copy asks the driver to confirm they actually received the amount. This records collection; it does not trigger or verify a bank transfer. After success, show Available for new requests with online state.

D13 — Trip history and collection summary. Trip list, gross freight collected, cash/UPI breakdown if data exists and detail/receipt. No net earnings, commission deduction, balance or payouts unless such data and rules are implemented. Distinguish pending collection from confirmed collection.

D14 — Account, vehicle and help. Document status, current vehicle, permission help, language preference, support and sign-out. No edit/online toggle that bypasses active-job reservation.

## Admin screen inventory and interactions

A01 — Admin sign-in. Phone/password, visible field labels, loading/errors and password visibility control. Do not reuse the customer no-OTP form.

A02 — Operations overview. Live map beside a searchable trip queue. Show active work, searching/unassigned requests, online/free/busy drivers, stale GPS and pending collection. Driver markers distinguish free, busy and stale states. Do not mix stale driver locations into “currently available nearby” counts. Separate operational totals from collection ledger totals.

A03 — Trip detail. Customer/driver contact, sites, load and truck class, quoted/final fare, chronological stages, GPS freshness, photos, collection status and actions permitted at that stage. Manual eligible-driver assignment and accepted-job release have clear explanations. Operator cancellation requires a reason. Show actor/time audit history. Advanced queue filters and detail presentation are proposed UX additions.

A04 — Service areas. Map polygon editor with name, active toggle, add points, undo, clear, edit and save. Distinguish saved service polygons from an unsaved draft. Provide coordinate input as an admin fallback. Show the rule that both sites must be inside active polygons, while remote customer phones are allowed. Thrissur initial rectangle is a starting configuration, not an official municipal boundary. Changes outside Thrissur must be possible. Explain affected eligibility before deactivation/deletion; impact-preview counts are a proposed later enhancement.

A05 — Driver review. Pending/test/approved/rejected lists, vehicle details, routing measurements and private document viewer. Approve/reject controls, missing-document explanation, active-work edit restriction. Keep Aadhaar and other identity details out of list/table previews and map popups. Rejection-reason messaging is a proposed enhancement if not supported by current backend.

A06 — Accounts. Customers, drivers and admins; search/filter; create/edit; deactivate and restore where supported. Explain that deactivation retains trip records. Admin creation includes password; prohibit self-deactivation. No permanent deletion of audit-linked trip records. Restore UI is proposed if not yet exposed.

A07 — Road reports. Pending/verified/dismissed reports with location, type, source, time and expiration. Verify/dismiss controls and route relevance. Clearly identify operator-verified reports, not a complete external live-event feed. Reports expire after two hours under current policy; unsupported avoidance must be shown as advisory.

A08 — Trip ledger. Searchable collection/trip records, status, method/reference, fare and CSV export. Say “Recorded collections.” Clearly label/exclude pilot mock records in operational reporting; automatic test-record filtering is a proposed addition, not currently guaranteed. Avoid bank-settlement, tax-invoice or payout claims.

A09 — Settings. Pause new service; remote-device requirement toggle; active test skips; support phone; initial dispatch radius and per-minute increment. Prefer clear descriptions and save confirmation. Pricing editor, arbitrary roles, payout controls and messaging are future extensions and should not appear as functioning launch controls.

A10 — Audit and integration status. Readable action/time/actor/booking history. Design a proposed integration-health panel that differentiates configured credentials from successful map/search/routing tests, denied access, stale worker, and queued notification records. Do not show “healthy” merely because a key exists. This health panel requires additional backend work.

## Shared exception and recovery states

Create reusable designs for: initial skeleton/loading; empty history; invalid input; provider map failure; search without coordinate access; offline connection; GPS disabled/denied/imprecise/stale; notifications denied; optional overlay denied; microphone unsupported/denied; upload failure; backend error; quote expired; duplicate-submit prevention; request claimed by another driver; search expired; service paused; location outside zone; approval pending/rejected; active-job lock; payment confirmation failure; and recovery after reload/reconnect.

On map failure, keep current trip details, stage controls and support usable. Show Retry map. Offer an existing confirmed/saved site or supported location capture when available. Do not offer a non-working map picker as the only alternative or silently substitute another provider. Unknown site coordinates must block booking confirmation, with a useful explanation. An admin-assisted coordinate-entry workflow is a proposed fallback requiring implementation, not an existing feature.

Stale tracking must show the last update age and “Location unavailable / last updated…”; do not animate movement or retain a confident ETA. Fresh GPS and ETA age are different signals. Stop showing customer access to the driver's subsequent live location after the trip ends.

Confirm consequential actions such as booking cancellation with fee, driver release, collection acknowledgement, account deactivation and service-zone deletion. Use concise specific confirmation copy; avoid modal confirmations for ordinary form navigation.

## Content and localization

Plain language, short sentences, labelled icons and clear verbs. Use “Pickup,” “Delivery site,” “Loading,” “On the way,” “Unloading,” and “Collection confirmed.” Avoid passenger words such as rider, seat, passenger or chauffeur. Avoid infrastructure errors and API names in ordinary user copy; keep detailed provider diagnostics in admin/help.

Use Indian rupee formatting and IST dates/times. Design English and Malayalam variants; allow extra text height instead of clipping. Obtain native-speaker review for Malayalam before launch. Preserve local place names and clear quantity units.

Illustrative design-only examples: pickup Punkunnam construction site; delivery Ollur site; 1 unit M-Sand; a 1-unit tipper; ₹1,905 freight; driver Anoop; vehicle KL 08 AB 1234; arrival estimate 8 min. These are layout examples, not actual availability, prices or verified trip data. Do not carry prototype examples into production as mock drivers or jobs.

## Performance and platform constraints

Design for lightweight web screens and affordable Android phones, with eventual iOS reuse. Reuse components, render truck art as small static assets, and load map/optional 3D only when needed. Do not require a map on login, account or receipt screens. Avoid autoplay backgrounds, large videos, continuous particle effects and large client libraries purely for decoration.

Keep native permissions and OS notifications platform-specific while retaining the same booking and trip content across web/Android/iOS. The driver web app is foreground-only for GPS/alerts in this pilot; do not claim background tracking from a closed browser. Native app notifications/overlay behavior must be represented as platform capability, not a universal web feature.

## Deliverables and sequence

1. Create a component/design-system board: colour/type/spacing tokens, buttons, fields, quantity input, address cards, truck cards, status chips, timer, map controls, bottom sheets, permission explanation, alerts, document/photo upload, fare breakdown and confirmation dialog. Include loading/disabled/error states.
2. Generate customer C01–C18. First polish Home, load details, location picker, vehicle selection, search, live tracking and completion, then expand the remaining states.
3. Generate driver D01–D14 using exactly the same design system. First polish online dashboard, offer, heading to pickup, loading/photos, transit, unloading and collection, then onboarding/history.
4. Generate admin A01–A10 at desktop width, with narrow-screen operational layouts.
5. Connect prototype journeys for manual booking, voice follow-up, successful trip, rejected/racing driver offers, timeout, unserviceable destination, stale GPS, upload retry and collection failure/retry.
6. Provide screen/component names, interaction notes, responsive rules and editable design tokens. If exporting code, keep map/native features as integration components and preserve the existing business logic/API contracts. Prototype visuals do not implement backend, GPS, push notifications, routing or payments.

Do not produce only a landing page or a few attractive dashboards. Deliver the complete stateful booking and fulfilment journey. Separate existing features from proposed UX additions so implementation scope stays visible.

## Acceptance criteria

- A customer can identify the load, confirm both sites, choose a suitable class, understand transport cost and request one truck without getting lost.
- A driver can see current status and the next action in under a few seconds, with no conflicting primary buttons.
- The customer and driver share the same trip stage, while their controls reflect their roles.
- Nobody mistakes a quote for availability, a stale point for live tracking, or collection confirmation for bank verification.
- Every important screen has a meaningful failure/retry state and a route to help.
- All tested business rules remain intact; no redesign creates a second active job, bypasses required photos, releases a driver before collection or accepts an unserviceable site.
- The experience works without decorative 3D, with slow data and with larger text, while retaining a recognizable PICKR identity.

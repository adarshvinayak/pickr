# PICKR — modern screen-by-screen Stitch guide

Prepared 11 October 2026. This is a design brief for the working pilot, not a request to replace its business logic. Screen IDs are export names. Screens described as proposed separation reorganize existing controls; they are not all separate routes today. Draw state variants as separate frames using suffixes such as `-empty`, `-loading`, `-error`, `-offline`, and `-success`.

## Paste this master prompt into Stitch first

Design PICKR, a construction-material and site-transfer truck booking service for Kerala. Build two consistent mobile experiences: PICKR Customer and PICKR Driver, plus a desktop-first PICKR Admin website. Use an original modern design, inspired by the clarity of transport apps without copying their branding. Customers and drivers include Malayalam speakers with limited familiarity with apps. Prioritize readable text, obvious next actions, large controls and a calm interface over decoration.

Use warm white #FAFAF7 backgrounds, white surfaces, deep charcoal #18221F text, muted grey #68736E secondary text and rust orange #B44718 primary actions. Use green #15805D for completed/available states, amber #B77913 for waiting and red #C43D3D for errors. These are proposed new theme tokens: preserve one palette throughout all three products. Check actual contrast in generated designs; do not use muted colours for essential text. Use subtle borders, 16px card radii, minimal shadows and an 8px spacing grid. Avoid nested cards, gradients, glass effects and large decorative hero sections. Use Noto Sans for English and Noto Sans Malayalam for Malayalam, with medium/bold headings. Use one consistent Material Symbols Rounded icon family. Use 16px body text, 14px supporting text, 24–28px screen titles and 52–56px main buttons. Allow multiline Malayalam labels without clipping. Pair status colour with a label and icon.

Design customer and driver screens at 390px wide and include 360px layout examples. Support Android safe areas, keyboard-open forms and future iOS safe areas. Admin is 1440px desktop with responsive tablet and 390px mobile layouts. Use a single fixed primary action on booking/task screens; keep secondary actions visible and thumb reachable. Bottom navigation is Home / Trips / Account for customers and Jobs / Trips / Account for drivers. During a job, prioritise the current task and its back/close navigation over bottom navigation. Keep form input when going back. Every screen must have a clear exit/back action where appropriate.

Maps use realistic road-map placeholders, pickup and delivery pins, a truck marker and a route line. Keep attribution space and map controls unobstructed. Show last GPS update and estimated ETA, not guaranteed arrival. Use a lightweight static truck illustration as the default; a low-poly truck preview is an optional asset slot, not a required animated 3D screen.

Use sample data labelled “Design example”: M-Sand, 2 bulk units, Thrissur pickup and delivery, a compatible truck and an example fare. Never invent rates, capacities, units, discounts, guaranteed ETAs or vehicle availability. Production data replaces examples. Do not expose private documents or personal data in exports.

Generate screens in the numbered batches below and keep the same components/tokens. For each screen include default, loading, empty, validation/error, disabled and success states where relevant. Supply both English and Malayalam versions of primary customer/driver screens. Export one named folder per screen with HTML and a screenshot, plus reusable component/style references. Mark unsupported future functionality as an optional design only, never as enabled.

## Rules every design must preserve

- Login for customers/drivers is name and phone without OTP for the private pilot. Do not show “verified phone” or add an OTP flow. Admin has password authentication.
- Both pickup and delivery must be within active service boundaries. A customer can book remotely from outside the area.
- Construction materials/site transfers only. Preserve catalogue-specific quantities and units; 1 bulk unit = 100 CFT. Never use a universal kg input.
- Vehicle recommendations must reflect load, capacity and site access. A full-looking list cannot imply all vehicles are eligible or nearby.
- Driver search expands once per minute for up to five minutes. Declining suppresses that booking for that driver. Only the first successful acceptance wins.
- Busy drivers receive no new jobs. Completed but unpaid jobs still reserve the driver.
- Arrival at pickup starts 30 minutes of free loading time. At least two load photos are required before departure, except the clearly labelled pilot test skip.
- Arrival at delivery starts a separate 30 minutes of free unloading time. Additional waiting uses the configured rate.
- Cash/direct UPI payment is collected after work completion and confirmed by the driver. This is not an in-app UPI gateway, wallet, payout or escrow.
- Customer cancellation is available before pickup/departure as enforced by the backend. Show an applicable fee before confirmation. After departure, direct to support rather than offering an unsupported cancellation.
- Driver can release an accepted job before departure, including at pickup; it restarts search. After departure, show support/escalation rather than a free cancel control.
- Test onboarding/photo skips must explicitly say “Skip for pilot testing”; skipped drivers are not verified.
- Address search can currently be unavailable because of Mappls access. Design pin selection and GPS alternatives. Do not advertise predictive traffic, fastest truck-safe routing, guaranteed incident avoidance or enabled remote push.

## Shared components to ask Stitch to design

Header with title/back/language; primary/secondary/danger buttons; text/phone/quantity fields; selected vehicle radio card; pickup-delivery route summary; fare breakdown; status chip; trip summary row; driver/customer contact row; map with bottom sheet; loading/unloading timer; upload tile; permissions card; offline banner; inline error; confirmation sheet; empty state; success receipt; admin table/filter toolbar; unsaved-changes bar.

Each trip stage needs its own heading and action. Use everyday labels: “Book a truck”, “Pickup”, “Delivery”, “Take job”, “At pickup”, “Load ready — start trip”, “At delivery”, “Unloading done”, “Payment received”. Malayalam drafts: “വണ്ടി ബുക്ക് ചെയ്യുക”, “ലോഡ് എടുക്കുന്ന സ്ഥലം”, “ലോഡ് എത്തിക്കുന്ന സ്ഥലം”, “ജോലി ഏറ്റെടുക്കുക”, “ലോഡ് കയറ്റി”, “പണം ലഭിച്ചു”. Have a local Malayalam speaker review final wording. Do not use “manifest”, “dispatch”, “consignment”, “settlement” or “geofence” in customer/driver interfaces.

## Customer screens — batch C

### C01 — Sign in
Purpose: start the pilot without an elaborate welcome journey. Top to bottom: compact PICKR mark; English/മലയാളം selector; “Book a truck for your site”; name; 10-digit phone; Continue; short pilot privacy/phone-not-verified note. Keyboard-safe button. Continue opens Home. States: empty form, invalid phone, submitting, disabled account, server unavailable. Do not put Driver/Admin links in the final customer APK's primary flow; role entry links can remain on a separate web landing page.

### C02 — Home
Greeting and active area label; large “Book a truck” action; secondary “Speak to book”; current trip card if present; short payment/waiting information; bottom tabs. Active trip opens C11–C16, not a second booking. Show service-paused state and no-service-area state. Avoid invented nearby fleet counts, promotions and unnecessary scrolling.

### C03 — Load and quantity (booking step 1/6)
Back, compact progress, “What are you moving?”; searchable material tiles; selected material; unit-specific quantity field with plus/minus and unit explanation; Continue fixed at bottom. Display minimum/invalid quantity and capacity warning inline. Keep material names recognizable locally. Continue goes to C04. Optional typed voice results fill these fields but remain editable.

### C04 — Pickup site (step 2/6)
Site-search input; saved-site shortcuts; Use my location; map/pin selection; selected address/site name; Confirm pickup. Exact pin confirmation is mandatory even after search. Search/loading/no-results/permission-denied/outside-area/search-unavailable variants. Search error: “Search is unavailable. Choose the place on the map.” Manual pin selection remains usable without GPS. Continue opens C05.

### C05 — Delivery site (step 3/6)
Same picker pattern with a delivery label and distinct pin; short pickup summary; Confirm delivery. Show unsupported-area explanation and Change location. Do not block remote customers based on their own phone position. Continue opens C06.

### C06 — Site access and timing (step 4/6)
Pickup/delivery summaries; simple access questions reflecting implemented fields, including narrow access; site instructions; book-now/scheduled controls if available in current implementation. Optional fields clearly labelled. Date/time picker cannot promise predictive ETA. Continue opens C07; back preserves all input. States: incomplete access choice, invalid/past schedule and changed service boundary.

### C07 — Choose truck (step 5/6)
Load summary; eligible truck cards with static illustration, display name/local name, capacity, estimated fare and selection radio; recommended badge with a brief reason; route distance/estimated duration; Continue. Ineligible vehicles either hidden or disabled with a reason. No available compatible truck state offers Edit load/site details. A separate low-poly asset slot may be designed, but must not make selection depend on downloading 3D assets.

### C08 — Review and confirm (step 6/6)
Pickup → delivery route summary; load/quantity; selected truck; schedule/access notes; Change links back to individual steps; itemised fare; free 30-minute loading and unloading allowance; extra-waiting rate; cash/direct UPI after delivery; fixed “Confirm and find a truck”. States: submitting, changed/expired quote requiring review, service paused, already-active booking. Never allow repeat taps to create duplicate bookings.

### C09 — Speak to book (guided conversation)
A separate conversation view, not a full-page chat history. One question, progress summary, large mic button, listening waveform only while listening, Stop, typed-answer alternative, language control and Back. Collect material, quantity/unit, pickup/delivery and access details through follow-up questions. Present editable answers, exact map-site confirmations and a final handoff to C08. States: mic denied, unavailable speech service, unclear answer, interrupted session. Never auto-submit a booking from speech.

### C10 — Finding a driver / scheduled trip
Pickup/delivery summary; searching animation, elapsed/remaining time and current radius; “We’re checking a wider area”; Cancel with fee-confirmation sheet. Scheduled variant shows scheduled time and that search has not started. Timeout variant: “No driver found”, Try again and Change details. Do not draw fake moving vehicles. Acceptance transitions automatically to C11; stale/recovered connection must reconcile actual booking state.

### C11 — Driver coming to pickup
Map occupying upper half; truck marker; estimated pickup ETA; last location update; driver name/truck/number/contact; load and route summary; progress strip; pre-pickup Cancel where allowed. Bottom sheet must leave map attribution and controls visible. States: GPS stale (“Last updated …”), driver released/search resumed, connection lost and accepted job recovered after relaunch. Do not substitute simulated live movement.

### C12 — Loading at pickup
“At pickup — loading”; loading timer showing free allowance vs billable extra time; current load and driver contact; photo thumbnails when available; short note that the driver starts the trip after loading. Customer view has no driver-only start button. If cancellation still allowed, use an explicit fee-confirmation sheet. Loading, missing-photo and paused GPS states included.

### C13 — On the way to delivery
Live map, route, estimated arrival, last update, truck and driver contact, load summary and current status. Main secondary action: Get help, with call support only when configured. No ordinary cancellation button after departure. Route/provider failure retains confirmed sites and driver contact. ETA change is not a new distance quote.

### C14 — Unloading at delivery
“Truck has arrived”; separate unloading timer and free allowance; delivered site and driver contact; waiting-cost explanation. No misleading “Paid” label before the driver confirms collection. Work completion opens C15.

### C15 — Work complete / payment due
Fare breakdown including any waiting/cancellation adjustments applicable to this trip; “Pay the driver”; cash/direct UPI explanation; payment status “Waiting for driver confirmation”. Do not show a functional Pay now gateway, fake QR or bank connection. After confirmed payment, open C16.

### C16 — Receipt and feedback
Completion/payment status; trip code; date; sites/load/truck; itemised total; payment method and confirmation; Print receipt; rate trip and optional comment; Back to Home. States: paid vs unpaid, print unavailable on web/device, feedback submitting/already submitted. Ratings are user feedback, not identity verification.

### C17 — Trips
Active, scheduled and past sections or tabs; compact rows with trip code, load, route, date, fare and status; paid/unpaid chip. Tap opens current stage or receipt. Empty state: “Your trips will appear here” and Book a truck. Cancelled/no-driver trips remain understandable in history. Loading/error/retry variants.

### C18 — Account and saved sites
Name/phone, pilot account label; language; saved sites; payment explanation; support if configured; Sign out. Name/phone read-only in the existing customer UI: do not add unsupported self-edit controls. Add-site opens a dedicated picker sheet (proposed separation of existing controls); site name/address/pin and Save. Include no saved sites and save-error states. Delete-site can be specified only where existing backend/UI action is wired, not as an assumed new feature.

### C19 — Help and interrupted service
Reusable states for no internet, backend waking/retry, session expired, service paused and area unsupported. Explain whether the trip continues and which data is preserved. Show Retry, Choose another place or Sign in as appropriate. Support contact is conditional; never invent a hotline. This can be a shared full-screen frame or sheet, not another bottom tab.

## Driver screens — batch D

### D01 — Sign in
Compact PICKR Driver identity, language, name, phone, Continue, pilot note. Same form accessibility as C01. First run opens D02; returning approved/test-enabled driver opens D06. States: invalid phone, disabled account and login failure.

### D02 — Truck setup (onboarding 1/3)
Vehicle catalogue selection with real capacity/local name; vehicle number; Continue. Selected vehicle visible throughout onboarding. Explicit test-only Skip button when allowed. Skip means test access, not document approval. Validation for missing/invalid number and unsupported vehicle.

### D03 — Truck measurements (onboarding 2/3)
Explain “Help us check road access”; height, width, length in metres; maximum gross weight and axle load in tonnes; simple illustrated measurement guide; Back/Continue. Avoid presenting these measurements as guaranteed truck-safe routing. Existing values retained on edit; editing blocked during an active job.

### D04 — Documents (onboarding 3/3)
Four labelled upload tiles: vehicle registration, RC book, driving licence, Aadhaar; upload/photo/file actions; file name/preview; replace/retry; Submit. Private document note. States: uploading, failed, unsupported/too-large file, partial submission. Pilot skip visually distinct. Uploaded is not automatically verified.

### D05 — Approval and permissions
Approval pending/approved/rejected/test-access variants; concise next steps. GPS permission explanation first, notification permission next, optional floating alerts separately. Buttons request actual native permission/open Settings; never show enabled merely because clicked. Web explains foreground limitation. GPS-denied/approximate/disabled-device-location states. Pending/rejected driver sees why jobs are unavailable.

### D06 — Jobs dashboard
Large Offline/Available control at top; GPS freshness and accuracy status; current job card takes priority; minimal finished trips/recorded collections summary; Jobs/Trips/Account tabs. Offline: “Go available to get jobs”. Available: “Waiting for a job”. No fake jobs or guaranteed earnings. Active/unpaid job disables availability changes that conflict with reservation. Notification/push configuration warning remains truthful and discreet.

### D07 — Incoming job
Full-screen alert or large sheet: pickup distance/estimate, pickup→delivery route, material/quantity, truck, fare, access notes and genuine request-expiry indicator if supplied. Fixed bottom row: Decline and large Take job, both visible without scrolling. Details may scroll above actions. States: accepting, already taken, expired, customer cancelled, offline. Successful acceptance opens D08. Decline suppresses the same search session. Avoid a fake countdown unsupported by the offer expiry data.

### D08 — Go to pickup
Map, pickup site/name/notes, contact customer, Open navigation, fixed “I’m at pickup”; small delivery/load summary. Navigation uses an external map app; do not design embedded turn-by-turn as already implemented. Before departure provide separate “Cannot do this job” → D15 release confirmation. GPS stale/no navigation app states. Arrival moves to D09.

### D09 — Loading
Clear “Loading at pickup”; large elapsed timer/free allowance; material/quantity/access notes; customer contact; next step “Add load photos”. Extra waiting shown with configured rate after 30 minutes. Releasing before departure uses D15 and clears the loading stage through backend rules. Do not offer Picked up before required evidence.

### D10 — Load photos and depart
At least two upload tiles/thumbnails, Add photo, remove/replace before submission if supported, upload status, fixed “Load ready — start trip” only when requirements met. Test-only skip is visible when enabled and labelled. Camera/gallery/file alternatives; permission denied/upload failure/retry/disconnected states. Confirmation prevents accidental departure; success opens D11.

### D11 — Deliver the load
Delivery map/site instructions, Open navigation, call customer, job summary, fixed “I’m at delivery”. GPS/update health discreetly visible. No new-job alert or ordinary release control. Report road issue/help in secondary menu. Do not encourage reading or typing while driving; main interaction is when stopped.

### D12 — Unloading
“At delivery — unloading”; separate 30-minute allowance and extra waiting; site/load information; customer contact; fixed “Unloading done”. Confirmation then D13. Reload preserves actual stage/timestamp; timer must not reset visually.

### D13 — Collect payment
“Work finished — collect payment”; itemised total and waiting charges; Cash / Direct UPI method; fixed “Payment received” with confirmation stating amount/method. No gateway, bank settlement, driver payout or cash-transfer animation. Until confirmed, prominent “You will get new jobs after payment is marked received”. Errors/duplicate submission recover without charging twice.

### D14 — Job finished
Success icon, trip code, recorded amount/method, receipt action, “Back to jobs”. Explain whether the driver remains available based on actual state; do not silently force availability. A new job can appear only after reservation is cleared.

### D15 — Cannot do job / release confirmation
Sheet with current stage, reason input, “Release job and let PICKR find another driver”, secondary Keep job. Available only before departure. Error states: stage changed, already released and lost connection. After departure replace this with help/contact support; never imply the loaded cargo can be cancelled without operator handling.

### D16 — Trip history and receipt
Rows of completed/cancelled/released jobs with dates/status/collection; detail receipt. Show recorded collections, not withdrawable balance or verified profit. Empty/loading/error variants. No payout wallet tab.

### D17 — Account / vehicle / documents
Profile and approval badge; vehicle number/type/measurements; Edit truck details disabled during a job with reason; document upload/view status; language; GPS/notifications/floating-alert settings; support; Sign out. Reuse D02–D04 for editing, not duplicated long forms. Private document-viewer expiration/retry states. Do not expose identity docs in public profile.

### D18 — Road issue and connection recovery
Road report form with actual supported issue choices, map location and description; send/success/error states. Separate offline/GPS interrupted banner advises stopping safely and reconnecting. On resume reconcile current job/offer, not cached availability. No promise that a report instantly reroutes everyone.

## Admin screens — batch A

Admin navigation: Trips / Service areas / Drivers / People / Trip ledger / Settings / Road issues / Activity. Desktop persistent sidebar, compact header and primary work area; mobile section menu rather than eight squeezed tabs. Prefer tables for lists and detail drawers for review. Separate ordinary and QA data clearly; exclude labelled test bookings by default.

### A01 — Admin sign in
PICKR Admin, phone/account identifier and password matching actual auth, Sign in, inline errors, show/hide password. No public admin signup or unsupported forgot-password link. No customer-style no-auth entry.

### A02 — Live operations
Top: active trips, fresh online drivers, recorded collections; active area label and refresh time. Main: live map plus queue with searching/accepted/loading/on-way/unloading/payment-due rows. Driver markers distinguish available/busy/stale and display last GPS time. Waiting-overrun alerts link to trips. Search/filter toolbar; QA inclusion switch off by default. Empty/no drivers/stale data/backend-down states. Metrics must not imply collections are net revenue.

### A03 — Trip detail
Drawer or dedicated page: trip code/status/timeline; customer/driver contacts; load/truck; pickup/delivery map; timestamps/timers; private load photos; fare/payment; event history. Stage-valid actions only: cancellation, release/restart search or assignment where the backend permits. Confirmation sheets show impact/fee. Disable stale-stage actions and refresh after conflict. An operator view must not bypass payment/stage invariants.

### A04 — Assign / reassign driver
Proposed dedicated modal for existing controls: selected trip summary; eligible drivers with truck, fresh GPS, distance if available and availability; choose and Confirm assignment. Exclude offline/busy/disabled/stale/incompatible drivers; empty state explains no eligible drivers. Reassignment before departure releases existing reservation/restarts search as permitted. Concurrent acceptance conflict refreshes list; do not silently overwrite an assigned driver.

### A05 — Service area list
Map with active/inactive polygons; table/list of name/status; Add service area; Edit; activate/pause; clear message that both sites must be covered. Bangalore example should show inactive unless explicitly activated. No hardcoded Thrissur-only design. Pause/save confirmation, empty list and failed update variants.

### A06 — Draw/edit service area
Map-first editor, name and Active control; draw points in order; Undo point, Clear points, Finish drawing, Save; visible point count and validation. Advanced coordinate JSON collapsed below map, longitude/latitude order labelled. Show draft vs saved polygon and unsaved-changes confirmation. Invalid/too-few/crossed/collapsed polygon states; successful save feedback. Delete confirmation must distinguish saved areas from unsaved drafts. Proposed improvement: vertex dragging only if implemented later; do not imply it already works.

### A07 — Drivers
Search/list/table by approval, availability, vehicle and enabled status; name, number, vehicle, document completeness, GPS freshness, active job; Review opens A08. Separate test-access badge. Empty/filter-no-results/loading. Avoid automatically asserting verified documents or road-safe truck measurements.

### A08 — Driver review
Identity/contact, truck/specification, four private document previews, uploaded/missing labels, onboarding-skipped flag; Approve / Reject or suspend with explicit confirmation. Explain active-job restrictions. Secure viewer loading/expired URL/retry; missing documents; approval saved. No automated Aadhaar, permit, expiry or licence verification claims.

### A09 — People
Customers/Drivers/Admins role filter; search and enabled/disabled filter; name, phone, role, status; Create/Edit opens A10. Deactivate action is recoverable account disabling, not permanent data erasure. Protect own admin account from inappropriate deletion. Long lists need pagination/virtualisation as a proposed implementation improvement, not fake controls.

### A10 — Create/edit account
Name, phone, role when creating; existing role read-only; admin-password field when relevant; enabled/disabled; Save/Cancel. Validation/duplicate phone/saving/success states; clear permissions wording. Existing trips remain after deactivation. No real credentials in design examples. Password changes must use actual supported admin flow.

### A11 — Trip ledger
Search/filterable rows with code, date, customer, truck, material, route, total, payment/status; recorded collection total; CSV export; QA inclusion off. Export scope text explicitly matches current view. Paid/unpaid and cancelled/no-driver not mixed into completed revenue. Empty/error/exporting states. Advanced date filters can be proposed, not shown as live unless implemented.

### A12 — Pilot settings
Sections: Service pause; Driver search (initial radius and per-minute expansion); Test controls (onboarding/photo skip); Customer coverage (remote customers allowed by default); Support contact; notification diagnostics. Plain-language help under each setting; Save changes with saved/unsaved feedback. Pause warns new bookings/assignments stop while active trips remain visible. Do not add fare editing or change rates/capacities as an assumed existing feature. Secrets never editable/displayed here.

### A13 — Road issues
List and map of reported issues, report category/location/time/review status; detail panel; actual review/dismiss controls. Loading/empty/dismiss confirmation/stale report states. Do not label unreviewed reports as verified closures or promise routing avoidance. Respect current provider limitations.

### A14 — Activity
Timestamped actions with booking/account/setting context; human-readable description; expandable technical details; clear actor where data exists. Empty/loading/error states. Never render private document payloads or credentials in screenshots. Rich filters/search are proposed only where not currently wired.

### A15 — System health / interrupted admin access
Proposed separation of existing diagnostics: database/migrations/maps configured; Firebase/push state; unsent push records; last refresh. Use “Configured” versus “Verified working” accurately. Read-only status, no secret values. Session-expired/access-denied/backend-unavailable frames with Retry/Sign in. Do not imply a test button or provider entitlement editor exists.

## Essential variant matrix

Ask Stitch for these frames, not just beautiful populated examples:

| Situation | Customer | Driver | Admin |
|---|---|---|---|
| No records | Trips/sites empty | No jobs/history | No trips/drivers/areas |
| Permissions denied | Map/mic typed/manual fallback | GPS/camera/notifications/settings | Private document viewer error |
| Slow/offline | Preserve booking; retry; trip last update | Preserve stage; no false availability | Stale timestamp; no false saved state |
| Race/conflict | Driver changed/cancelled | Taken/expired request | Assignment or stage conflict |
| No service | Both site checks; remote user allowed | No eligible offers | Inactive/invalid polygons |
| Validation | Quantity/unit/site/schedule/quote | Vehicle/docs/two photos | Duplicate account/invalid boundary |
| Money | Due/paid/cancel fee | Cash/UPI confirmation/unpaid reservation | Collections vs revenue; QA excluded |
| Recovery | Relaunch active trip | Resume active job / new offer | Unsaved changes / refresh conflict |

## Build/export order

1. Shared design system plus C01/C02/D06/A02. Approve a single theme before generating everything.
2. C03–C08 manual booking and D07–D14 driver job stages. These are the pilot priority.
3. C10–C17 tracking, receipt and history, with stage-matched customer/driver frames.
4. A03–A08 trip operations, assignment, boundaries and driver approval.
5. C09 voice; D01–D05 onboarding; C18–C19/D15–D18 accounts and recovery.
6. A01/A09–A15 management/settings/reports and mobile admin variants.

Use each ID as an export folder name, e.g. `C08-review-confirm/en/default`, `C08-review-confirm/ml/quote-expired`, `D07-incoming-job/ml/already-taken`, `A06-service-area-editor/en/invalid-polygon`. Include screenshots, HTML/CSS, font names and icon names. Do not mix alternate themes between batches.

## Prompt to generate any individual screen

Using the approved PICKR design system and master business rules, create [SCREEN ID — NAME] from the screen specification below. Preserve its purpose, fields, displayed data, primary action, secondary actions and destination. Use realistic design examples only. Generate default plus the specified edge-state frames. Include 390px and 360px mobile layouts for customer/driver screens, keyboard-open layout for forms, English and Malayalam copy, and a sticky action where specified. For admin include desktop plus responsive mobile. Export named HTML/CSS and screenshots; reuse components rather than introducing a new theme. Do not invent enabled features or alter payment/cancellation/vehicle rules.

Paste the relevant screen entry after this prompt. Generate a few related screens at a time so Stitch can maintain consistency; do not ask it to squeeze the whole product onto one screen.

## Acceptance checks before importing

- Same typography/palette/components across all exports, with no remote font dependency required for APK runtime.
- Malayalam reviewed, no truncation at 360px or enlarged text; primary action remains visible above keyboard/safe area.
- One main action per stage; Decline remains visible in incoming jobs; back preserves booking input.
- Maps retain attribution and controls; GPS stale state does not imply current location.
- Every customer tracking stage pairs with its actual driver stage; paid state appears only after confirmation.
- No unsupported wallet/gateway/automatic verification/predictive routing/3D fleet claims.
- Icons are consistent vector assets; illustration/3D assets delivered separately with licence and lightweight fallback.
- Admin editable forms have save/error/unsaved feedback and confirm impactful actions.
- Sample personal/financial data clearly fictional and replaced by runtime data.

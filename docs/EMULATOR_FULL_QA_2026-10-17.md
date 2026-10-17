# PICKR Android emulator QA — 17 October 2026

Both APKs were installed and exercised on the PICKR_QA Android 15 / API 35 ARM emulator. Testing began on 16 October and continued on 17 October. The apps used the real Render backend, Supabase database/private storage and Mappls maps/routes. Emulator GPS and clearly labelled QA loads, accounts and images supplied test inputs; no runtime simulation was added to the product. No real load, identity document, telephone call or money transfer was used.

The main customer-to-driver journey passed: booking → dispatch → acceptance → pickup → two uploaded photos → delivery tracking → unloading → cash confirmation → receipt → feedback. This is an emulator validation of the pilot, not certification of every phone, provider entitlement or physical road condition.

## Build and evidence

- Customer package: `in.pickr.pilot.customer`; driver package: `in.pickr.pilot.driver`.
- Version 0.9.2-pilot, code 11. Separate APKs, each about 3.1 MB, with the Render HTTPS backend built in.
- Lint, TypeScript, 75 automated tests in 12 suites, production Next build and both Android builds passed.
- No PICKR application crash was recorded in the captured crash buffer; UiAutomation process errors were separated from app failures.
- Fresh backend checks: **42 passed**: 19 trip/dispatch regressions, 16 validation/privacy checks, four admin account checks and three scheduling checks. These are API checks, not claims that each admin control was tapped in Android.
- [Machine-readable results and selected screenshots](qa/emulator-2026-10-17/). Full local screenshots and build manifest remain under `artifacts/`.
- Main trip **PK-10362F02** completed/paid, two photos, no photo skip, cash recorded and customer rating 4/5. [Saved proof](qa/emulator-2026-10-17/trip-proof.json).

## Customer app checks

| Area | Result |
|---|---|
| Sign-in | Empty name and invalid phone blocked; valid test customer signed in; account survived restart and APK update. |
| Material and quantity | Search, single-selection radio controls, minimum quantity and plus/minus worked. Narrow-road incompatible load blocked before booking. |
| Pickup/delivery | Real Mappls map loaded. Zoom and drag changed the centre-pin coordinate; stationary pin stayed stable. Current location, saved sites and both confirmations worked. |
| Address | Reverse lookup displayed road, locality, city/district, state and PIN, without deliberately including house/store fields. Provider administrative names can repeat or vary in spelling. |
| Place search | **Blocked by Mappls coordinate entitlement**; explicit error and usable map-pin fallback observed. |
| Truck and price | Eligible trucks, recommendation, larger override, fare breakdown, waiting rate and pay-after-delivery copy worked. |
| Manual booking | All six booking stages completed against the real backend. No-driver timeout displayed no charge; retry created a new search session. |
| Voice-assisted booking | Native microphone denial displayed fallback; two failures automatically revealed typing. Tappable material/quantity/time/access choices and map confirmations filled all slots vertically. Quantity correction preserved the other answers and changed the recommended truck. A voice-intake booking was created and cancelled with ₹0 charge. |
| Tracking | App restart restored the accepted booking. Simulated native GPS movement propagated to the customer map; route and ETA refreshed. Stale guidance cleared after fresh data arrived. |
| Cancellation | Reason sheet, Keep booking, Not yet and final confirmation worked. Actual pre-acceptance cancellation showed ₹0. Accepted cancellation fee and post-arrival blocking passed API tests. |
| Receipt/review | Paid cash receipt itemised fare, two private load photos were retained, 4-star feedback persisted. |
| Scheduling | Future time persisted; an available nearby driver received no early offer; scheduled cancellation passed API checks. Native date/time picker was not exhaustively exercised. |

## Driver app checks

| Area | Result |
|---|---|
| Onboarding | Eight truck options, vehicle number, all five dimensions/weights, four real private test uploads and normal submission to pending approval worked. Missing measurements blocked. Pending/rejected states displayed; admin API approved only the QA driver. |
| Location | Denial then precise permission grant, GPS-off error, GPS settings shortcut and return recovery passed. Real native updates reached the server (5 m accuracy observed; other samples varied). |
| Permissions | Android notification and draw-over-other-apps permission flows passed. Native foreground tracking service observed. |
| Requests | In-app Take job and native notification Accept assigned the correct job. A floating request card appeared over the customer app. Direct floating-card buttons were not tapped because the non-focusable overlay is absent from the accessibility tree. |
| Notification lifetime | Request still present at 68 seconds, offer still available; Android reported five-minute expiry. Backend removes offers when no longer eligible. |
| Busy guard | Assigned driver received no new offers. Driver stayed reserved after work completion until payment confirmation. |
| Navigation/contact | Google Maps opened the exact pickup route. Call customer opened the correct dialler number without placing a call. |
| Loading/photos | Pickup arrival started the 30-minute free timer. Android camera capture and file selection both uploaded. Zero/one photo disabled departure; two enabled it. Not yet/confirm worked. |
| Delivery | Started trip, simulated movement, reached delivery, unloading timer and completion confirmation worked. |
| Collection | Cash second confirmation, recorded receipt, driver release and history totals worked. Direct UPI method/reference and release passed API tests; no real UPI transfer occurred. |
| Release | Cannot do this job → reason → confirm returned the job to search, freed the driver and suppressed that same driver for this search session. Release after departure was rejected in API testing. |
| Account/history | Documents list, external document handoff, English/Malayalam switching, past-trip filter and recorded collection total inspected. External document browser reached Chrome first-run Terms; no Terms were accepted. Signed-file access and unrelated-customer rejection passed API checks. |
| Offline | Wi-Fi and mobile data disabled: explicit connection/stale warnings and recovery screen retained the account/history. Network restored before final checks. |

## Backend/admin and edge cases

All 42 fresh checks passed. Named cases are retained in the JSON evidence, including:

- First acceptance wins under concurrent requests; declined requests stay suppressed; another driver can accept.
- Duplicate booking key returns the same trip; customer cancellation before acceptance has no fee; after acceptance records the configured fee.
- Customer cancellation at pickup and driver release after departure rejected; no-photo departure rejected; permitted test skip explicitly recorded in a separate regression trip.
- Completion without collection keeps driver reserved; UPI confirmation releases the driver.
- Unauthenticated snapshot and customer admin access rejected; unrelated customer cannot update a trip or view its photos; assigned customer can view them.
- Zero/negative/over-capacity quantities, incompatible narrow road, outside-zone destination, past schedule, stale/future GPS and tampered quote rejected.
- Unchanged settings saved; paused Bangalore QA polygon created and deleted; degenerate polygon rejected. Original service polygons were not altered.
- QA account created, edited and soft-disabled; own admin disable rejected. Audit/trip records retained.

This pass tested admin functions through the backend. A fresh exhaustive visual test of every admin screen in emulator Chrome was not performed because first-run browser Terms require human acceptance.

## Fixes made during this run

1. **Truck setup content hidden below footer:** made onboarding content scroll independently above its fixed footer. Reset scroll on stage changes.
2. **GPS-off wait:** check Android device location before starting a browser geolocation request; show an immediate useful error. Added direct Location settings handoff.
3. **Job alert disappeared after one minute:** use five-minute expiry for truck requests while retaining the shorter expiry for other notices. Retested after 68 seconds.
4. **Voice quantity choices:** respect each material minimum, use full words, parse “numbers” and “kilograms,” supply quantity correction choices and singular “1 unit.”
5. **Voice failure recovery:** native and web recognition failures share the same two-failure fallback; missing browser recognition opens typing immediately.
6. **Voice editing scroll:** defer question scroll until the parent screen has updated.
7. **Pin appearance:** use the bundled map-pin symbol rather than an emoji.

No rates, vehicle capacities, payment integrations or database schema were changed. A 320 dp / 130% text driver-dashboard check remained usable with wrapping and scrolling; this is not an exhaustive accessibility audit.

## Remaining limits and improvements

| Priority | Finding | Next step |
|---|---|---|
| Before field pilot | Mappls location-search results cannot resolve numeric coordinates with current entitlement. | Enable Location Coordinates/appropriate Place Details access, then test search-to-map on both web and Android origins. Until then use exact map pins/saved sites. |
| Before relying on closed-app customer alerts | Health reports Firebase unconfigured. | Supply Android Firebase files/server credentials, rebuild and verify customer/driver push with app closed and phone locked. Foreground driver service alerts passed; force-stopped delivery is not proven. |
| Before real truck navigation | Standard traffic ETA works; predictive routing, measured truck constraints, traffic-optimal route selection and comprehensive incident feed are not enabled. | Obtain provider entitlements, test known local roads/bridges/site entrances and compare ETA to actual travel. Keep external navigation and route limitations visible. |
| Before opening public access | Name/phone-only login and test onboarding skips are intentionally enabled by the requested pilot scope. | Restrict pilot participants, review production identity verification and switch off skips before unrestricted launch. |
| Launch configuration | More than Thrissur is active in existing configuration; home shows “+2.” | Review and deactivate unwanted existing zones if launch is to be Thrissur-only. This test did not change them. Both endpoints must be in an active zone; endpoints need not be in the same polygon. |
| UX | Voice uses a long vertical review; header retains manual step counts and some internal-looking labels such as “m sand”/“normal.” | Use display names and a voice-specific “Review booking” header; reduce redundant time/access controls after voice completion. |
| UX/localisation | Core Malayalam screens work; some validation/help/reason/measurement text remains English. | Have local drivers review vocabulary; translate remaining strings and check larger-text layouts. |
| Product gap | Business rules describe rescheduling existing bookings; current pilot API exposes initial scheduling but no reschedule action. | Add server-validated rescheduling with driver release, fresh quote and an explicit no-fee policy before promising this feature. |
| Policy clarification | Display uses exact integer total (e.g. ₹1,746), while old business rules mention nearest-₹10 display rounding. | Choose one display policy and align docs/UI; do not silently change the underlying fare during QA. |
| Device testing | OEM battery restrictions, screen-off GPS, real road accuracy, low-memory camera return, long offline/reconnect, microphone transcription in Malayalam/English and printer completion need physical phones. | Run a supervised empty-truck route on at least two drivers’ actual Android phones and record GPS/ETA gaps. |

## UX assessment

These are inspection judgments, not scores from a user study.

| Dimension | Score / 5 | Reason |
|---|---|---|
| Ease of use | 4 | Clear primary actions and separate trip stages; permission recovery and provider search still add friction. |
| Understanding | 3.5 | Plain core wording, useful payment explanation; mixed-language edge text and a few technical labels remain. |
| Navigation | 4 | Separate customer/driver apps, bottom navigation and stage confirmations; long voice review needs refinement. |
| UI simplicity | 4 | Consistent fonts/icons, restrained colours, large controls; reduce repeated summaries in voice review. |
| Pilot readiness | 3.5 | Main journey passed; field GPS/alerts and provider configuration still need validation. |

## Cleanup and handover

Only this run’s QA accounts/bookings/files were targeted. Terminal trip/photo/audit records remain labelled for inspection. QA drivers are set offline and test accounts are soft-disabled; no real driver was used. Test service settings and temporary boundary were restored/removed. Device network, GPS, density and font settings are restored; test GPS loop is stopped. APK app data is reset to sign-in for a clean handover. Final APK hashes and source commit are recorded in `artifacts/pickr-build-manifest.json`.

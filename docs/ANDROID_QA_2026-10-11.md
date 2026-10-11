# PICKR Android emulator QA — 11 October 2026

## Result and scope

The core trip completed against the hosted Supabase/Mappls backend using the installed customer and driver APKs: booking, dispatch, background request acceptance, pickup, two camera photos, simulated travel, delivery, unloading, payment confirmation, customer review and a saved PDF receipt. A subsequent native manual booking also reached the driver, was released at pickup, and was cancelled by the customer after search restarted.

This is a supervised-pilot result, not a claim that every feature works on every Android phone. Address search and remote push still have configuration blockers. Real-road tracking, speech accuracy, OEM battery restrictions, force-stopped delivery and truck-safe turn-by-turn navigation require physical-device testing. The web app does not provide native background tracking.

Used the `test-android-apps:android-emulator-qa` skill. Taps came from fresh accessibility-tree bounds; screenshots were inspected for layout. The target was Pixel 5, API 35, ARM64, 1080 × 2340: normal density 440 (about 393dp), and density 540 (320dp) with system text size 130%. English and Malayalam, portrait, and a landscape booking draft were inspected. This does not cover all screens in every orientation or text-size combination. Android 26–34, TalkBack and iOS were not tested.

The admin is a responsive website, not a third APK. Its eight sections and CRUD forms were exercised in an emulator WebView test browser. Chrome became unresponsive during the text-size test; the isolated browser provided working UI input. This tooling issue is not classified as a PICKR app crash.

## Build

- APK version: **0.8.0-pilot / code 8**. Final application source: `3b471599078dae326784bb4c244856ca867ebc0e`.
- Embedded backend: `https://pickr-xueh.onrender.com`. Maps and API requests use the real hosted services; no runtime motion simulator was added.
- Customer APK: `artifacts/pickr-customer-debug.apk`, 3,199,123 bytes, SHA-256 `4507d8254f843f6d645414214c3792842206561b8c7cf310025da99270257271`.
- Driver APK: `artifacts/pickr-driver-debug.apk`, 3,199,115 bytes, SHA-256 `90e9ccdab3bb9cc6ec5442b183840465a466b2619ba3790af1d3242cda715c5c`.
- ESLint, Next production build, Vite/Gradle builds and **66 unit/regression tests across 10 suites** passed. Local logs and checksums are in ignored `.local-tests/` and `artifacts/` directories.
- The crash buffer contained UiAutomation/uiautomator tooling failures; no PICKR application-process crash was observed in this run. This is not a crash-free guarantee outside the tested flows.

## UI and flow fixes from this pass

The supplied Stitch fonts, icons, cards and palette remain in use. Changes below address observed interaction and layout problems rather than replacing the design direction.

| Finding | Change | Verification / limit |
|---|---|---|
| Android keyboard covered form fields/actions | Resize the WebView content using system/keyboard insets | Native name/phone, onboarding and booking fields edited with the keyboard open |
| Android Back could leave modal/onboarding flows stuck | Dispatch a cancelable Back event; close dialogs, step back through onboarding and background at Home | Before/after native Back checks; trip confirmation dismissed and reopened |
| Draft lost on app process restart | Persist booking draft per account in local storage; clear on booking/logout | Force-stop/relaunch retained pickup, destination and notes |
| Rotation recreated the WebView | Handle orientation/screen-size changes in the activity | Landscape booking kept sites and notes, with usable actions |
| Large text pushed content beneath header/navigation | Measure rendered bar heights with ResizeObserver; honour Android font size | Normal and 320dp/130% layouts inspected; long pages still require scrolling |
| Malayalam brand/nav words split awkwardly | Allow brand wrapping; use shorter nav labels and natural word boundaries | PICKR/DRIVER and Jobs/Trips/Account remain understandable at large text |
| Fare digits wrapped inside the request/trip heading | Give currency an unbreakable flex item; allow the row to wrap around it | Foreground Malayalam request fare verified; final narrow trip heading retested |
| Foreground driver saw request, overlay and heads-up alert together | Show overlay only in background; remove overlays on activity resume; use quiet foreground notification channel | Updated native foreground request shows one request card; background overlay acceptance/decline tested earlier in this pass |
| Disabled fixed loading action was translucent | Use an opaque disabled background/text colour | Scrolled text no longer shows through the disabled action |
| Loading/unloading controls appeared after large maps/stage ladders | Collapse driver site map in stationary stages and prioritise timer/photos/collection | Loading and unloading screens inspected; photo gate exercised |
| Driver stayed on “Getting your trip” after releasing work | Return to Jobs only after a successful release | Final native release retest recorded below |
| Scheduled booking headline said Finding a truck before its departure time | Label future bookings Scheduled in trip, home and history; retain the actual server status | PASS: final native trip shows Trip scheduled before its time; scheduled cancellation returns to Trip cancelled / ₹0 at the top |
| New stage could be above the current scroll position | Scroll to the top when trip status changes | Pickup transition shows its new stage and timer at top |
| Cancelled/failed searches looked like unpaid full fares | Show recorded cancellation fee or zero/no charge | Native history shows no-charge cancelled requests |
| Paid trips remained in the Active filter | Make Active/Past filters mutually exclusive | Filter definition corrected; final native history check recorded below |
| Offline warning disappeared while scrolling / covered recovery content | Pin connection warning below measured header, reserve its measured height, and show saved-sign-in recovery on cold launch | Failed offline payment left backend pending; final cold launch had readable, separate banner/error/recovery content |
| Voice parsing confused “access” with ACC / P-Sand with M-Sand | Use whole-word longest alias matches; preserve slots when choosing locations | Four regression cases; typed/chip intake retained M-Sand and exact sites |
| Voice follow-up was below a large previous picker | Scroll each new question below the header | PASS: native M-Sand choice scrolled quantity question below header; later location follow-up inspected |
| “Pick a time” had no usable follow-up | Show labelled date/time input and disabled-until-valid confirmation | PASS: native date/time picker set tomorrow 21:32, carried into intake, quote and a saved scheduled booking; no premature driver offers |
| Partial photo batch failure could lose earlier successes in UI | Append each successful upload immediately | Two normal camera uploads passed; interrupted multi-upload not reproduced |
| Admin mobile tabs formed several rows | Use one section selector; retain desktop navigation | All eight admin sections opened through selector |
| Admin header/feedback lost in long mobile forms | Wrap mobile header; scroll save/error feedback into view | Normal mobile header and saved values inspected; final feedback auto-scroll at large text not independently retested |
| Road report form was too long / captured position before opening | Collapse report creation and mount driver form at opening time | Submission/dismissal passed; moving-then-opening coordinate retest remains |
| Stale online GPS could look “ready” | Show Check GPS and a Refresh GPS action | Fresh GPS ready state passed; final stale/recovery case recorded below |

## Exercised customer and driver cases

PASS means the action/state was observed in this run, not merely inferred from source code. Where a feature had earlier API coverage, that is distinguished from a current emulator check.

| Case | Result / evidence |
|---|---|
| Customer login and saved-site booking | PASS: actual native manual flow reached quote/review and created `PK-D058868E` |
| Driver full onboarding | PASS: real Android file picker uploaded four labelled test documents; vehicle/dimensions entered; approval guard seen; only QA driver approved |
| Driver location permission denial | PASS: denied location prevented usable online activation; permission recovery and fresh native GPS succeeded |
| Native notification / overlay settings | PASS: settings UI opened and overlay permission granted |
| Background request | PASS: native floating card over launcher; Deny excluded that request beyond a later search round; another request accepted from the card |
| Foreground request after fix | PASS: single request card, readable rupee fare, accept reached assigned pickup route |
| Pickup and destination maps | PASS: real Mappls map loaded with site/driver markers; traffic ETA appeared above map; no fake road route substituted |
| Pickup/loading timer | PASS: reached pickup started 30-minute timer; fixed next-stage action disabled without sufficient evidence |
| One-photo gate | PASS: one photo was insufficient to start transit |
| Two-photo camera capture | PASS: two actual emulator camera captures uploaded without skip; compressed images accessible through customer-authorized file endpoint |
| Start trip confirmation and Back | PASS: Back dismissed confirmation, reopening and confirming advanced to IN_TRANSIT |
| Travel and tracking | PASS: emulator GPS moved through pickup, midpoint and destination; customer tracking updated; Mappls route/ETA refreshed |
| Call customer/driver | PASS: correct labelled QA number opened Android dialler; no phone call made |
| External Google Maps navigation | PARTIAL: Maps intent opened; actual drive, voice guidance and return-from-navigation GPS remain field checks |
| Road issue submission | PASS: labelled pending site-access report submitted; admin dismissed it; no real obstruction published as verified |
| Destination/unloading | PASS: reached destination started its 30-minute timer, then work completed |
| Payment while offline | PASS: network absence confirmed, payment failed, backend stayed pending and driver remained reserved |
| Restore network and direct UPI confirmation | PASS: driver recorded a labelled test confirmation after reconnect; payment became paid and driver released. No UPI transfer occurred |
| Review | PASS: customer submitted five stars and an explicitly labelled synthetic-load comment |
| Native receipt | PASS: Android two-page preview rendered; Save as PDF wrote `artifacts/emu-trip-receipt.pdf` (138,373 bytes) |
| Driver can receive another booking after payment | PASS: `PK-D058868E` reached the released driver |
| Driver release at pickup | PASS: request restarted search, pickup assignment cleared, releasing driver received no repeated offer |
| Customer cancellation after release | PASS: reason/confirmation entered through UI; backend CANCELLED; driver free, no offers |
| Five-minute expiry | PASS for observed terminal NO_DRIVERS on a QA search; all radius rounds were comprehensively exercised by earlier API/clock tests, not separately timed in this run |
| Typed/chip voice booking | PASS through recommended vehicle review with retained M-Sand, unit, saved sites and road access; native manual flow separately created the booking |
| Actual Malayalam speech recognition | NOT VALIDATED: emulator mic/recognizer availability is not representative of a driver speaking outdoors |
| Custom scheduled booking | PASS: native picker → retained sites/material → quote → booking PK-8F585031 for 12 October 21:32 IST; backend stored matching future timestamp, driver offers empty. Actual next-day dispatch was not awaited |
| Labour / narrow road / every catalogue option | NOT RERUN end to end here; retain earlier API coverage, perform targeted field/UI follow-up |

Completed main trip: **PK-11D707C0**, id `df01a2aa-4a67-41d2-96ba-67195cb45059`, two photos, recorded paid ₹1,746. QA amounts are audit entries, not funds. Later quotes differed as real routing inputs/provider responses differed; no fixed fare was substituted.

## Admin checks

| Feature | Result |
|---|---|
| Sign in/out and section navigation | PASS: mobile sign-in; all eight sections opened; sign-out completed |
| Overview/operations map | PASS: loaded active area and operational UI |
| Service-area creation | PASS: created inactive `QA_EMULATOR_Bangalore_INACTIVE` with four Bangalore coordinate pairs |
| Invalid boundary input | PASS: malformed coordinate JSON blocked save; editing partial text remained possible |
| Boundary save/delete | PASS: valid polygon persisted; delete confirmed in UI and absent in backend. Existing active Thrissur boundary unchanged |
| People create/edit/disable | PASS: labelled QA account created, name edited, then disabled; backend confirmed disabled |
| Settings save | PASS: saved existing values and verified backend; service stayed unpaused, remote customers permitted, test skips enabled. Service was not interrupted to test the pause toggle |
| Road report review | PASS: selected labelled pending report and dismissed it; backend confirmed dismissed |
| Drivers, ledger, activity | PASS for mobile navigation/rendering; approval/document review, manual assignment, every drawer/filter and CSV were not all repeated in this emulator pass |
| Admin roles and access control | Earlier API tests cover these; not a new emulator sign-off |

## Remaining edge cases and how to handle them

The previous [QA report](QA_REPORT_2026-10-11.md) records 85 browser/API checks including competing accepts, idempotency, cancellations, geofences, quote signatures and authorization. Those results remain separate; this report does not relabel them as new Android tests.

| Edge case | Current handling / next validation |
|---|---|
| Two drivers accept simultaneously | Atomic server claim; loser conflict response; earlier race test passed. Repeat with two physical phones |
| Double booking tap / retried request | Signed quote + request key/idempotency; earlier tests passed. Repeat during flaky mobile data |
| Denied/released driver receives same search again | Server exclusion; observed native Deny and release both had no repeated offer |
| Busy driver receives another job | Dispatch excludes active driver; active reservation observed through pending payment. Repeat under multiple concurrent customers |
| Customer tries to cancel after loading/departure | Customer cancellation UI unavailable; earlier API guards passed. Operator assistance is required; no silent cancellation |
| Offline stage/payment update | Server write fails; do not fabricate success or collect automatically; pending-payment recovery observed |
| GPS stale, imprecise, denied or disabled | Eligibility uses real fresh samples; visible stale hint/refresh action. Physical screen-off/GPS-toggle/OEM tests remain |
| App killed, force-stopped or phone rebooted | Bundled UI and saved login/draft survive ordinary restart. OS force-stop can stop tracking/alerts; FCM and real-device recovery require explicit testing |
| Map/search provider unavailable | Display error/retry; use exact map pins/saved sites when coordinates are available. Address search entitlement still blocked |
| Upload interrupted midway | Completed uploads remain visible; partial-failure/retry not reproduced. Test with data loss during a second image and ensure no duplicate/out-of-order photo evidence |
| Wrong device clock / future GPS | Server timestamps validated by prior tests; do not infer readiness from handset clock alone |
| Remote customer outside pilot | Allowed; both exact sites must be in an active zone. Earlier service-area API checks passed |
| Boundary edits while jobs are active | Do not promise retroactive reassignment; validate intended operator policy before using live boundary changes |
| Customer phone impersonation | Pilot login deliberately has no OTP. Use known invited accounts; real phone verification is required before unrestricted public access |
| In-app navigation on restricted truck roads | Standard ETA does not apply measured dimensions or guarantee fastest/incident-safe routes. Drivers verify restrictions; request provider entitlements before advertising those capabilities |
| Real cash/UPI mismatch | Driver confirmation is a manual record; no gateway reconciliation/payout. Verify amount received, resolve disputes through the operator |
| Large font, small viewport, long Malayalam/site names | Currency kept intact; rows may wrap; forms remain scrollable. Test TalkBack and extreme text scaling on physical phones |

## Configuration and field-test requirements

1. **Mappls address coordinates:** enable Place Details **Location Coordinates** access for the actual REST credential. Current `geocode?q=Thrissur` probe returns an explicit entitlement error. Retest search, result selection and reverse geocoding with actual Thrissur site entrances. Map pin/saved-site booking and standard traffic ETA worked.
2. **Firebase remote push:** provide the Firebase Android configuration for both application IDs, server-side push credentials and run the push worker. Health currently reports `firebaseConfigured: false`. Current native background polling/local overlay works while the service/network are alive; it is not verified FCM delivery to a sleeping/terminated app.
3. **Routing capabilities:** current standard traffic ETA works. Predictive v2, measured truck restrictions, fastest traffic routing and comprehensive provider live incidents are not active. Do not advertise them based on an enabled API tile; require successful credential-specific requests and road validation.
4. **Physical pilot:** customer phone plus at least two driver phones; validate precise GPS, screen off, external Maps, loss/restoration of data, low battery, notifications denied, overlays denied, GPS off, app restart/force-stop and Malayalam speech. Start with an empty vehicle on known roads.
5. **Operations:** verify the support number, actual service polygon, approved documents, recorded vehicle dimensions and collection process. Account approval/identity/payment confirmations are operator responsibilities; these tests do not verify documents or transfer funds.

## Ease-of-use review

These are expert heuristic scores from this run, not measured user-research results.

| Area | Score / 10 | What works / what to improve |
|---|---|---|
| Ease of use | 8 | Manual steps and stage actions are clear. Restoring usable address search will reduce map-pin friction |
| Ease of understanding | 7 | Malayalam core actions and trade units help. Route limitations, cancellation reason, photo counts and voice follow-ups still contain English; localize and test wording with actual drivers |
| Navigation | 8 | Three main destinations, preserved drafts, native Back and explicit confirmations. Successful release now returns to Jobs |
| UI simplicity | 7 | Stationary-stage controls are prioritized. Admin forms/profile/booking detail remain long; progressively disclose operator options after field feedback |
| Readability/touch use | 7.5 | Local fonts, minimum 13px/56px controls, natural wrapping and large-text checks help. At 320dp/130%, headers/actions occupy substantial space; physical outdoor testing and TalkBack still needed |
| Feedback/recovery | 7.5 | Offline warning, confirmation dialogs, explicit route limits and saved drafts help. Add targeted interrupted-upload/slow-map tests and clearer operator recovery instructions |

The highest-value UX work next is coordinate-enabled search, consistent Malayalam error/help text, a shorter driver onboarding review, and reliable physical-phone notification/GPS recovery. Additional decorative cards or 3D trucks would not resolve those test limitations. The supplied designs contain no usable low-poly 3D vehicle assets; catalogue illustrations remain lightweight SVGs.

## Evidence and test hygiene

Screenshots/PDF/APKs are local ignored artifacts, not committed secrets or production seed data. Relevant files include `emu-keyboard-after.png`, `emu-draft-recovered-notes.png`, `emu-landscape-booking-draft.png`, `emu-foreground-offer-fixed.png`, `emu-driver-accepted-fixed.png`, `emu-two-photos.png`, `emu-payment-offline-rejected.png`, `emu-paid-driver-released.png`, `emu-admin-boundary-invalid.png`, `emu-admin-boundary-valid.png`, `emu-admin-account-disabled.png`, `emu-admin-road-dismissed.png` and `emu-trip-receipt.pdf`.

All bookings/documents/reviews/reports were labelled synthetic QA. Only the designated QA driver was online during guarded broadcast tests. No real customer booking was accepted or cancelled; no real call, load or transfer occurred. The temporary Bangalore polygon was inactive and deleted, and the test road issue was dismissed. Audit rows are retained rather than rewriting history.

## Final recovery checks

- **Driver release navigation PASS:** `PK-38330C10` released at pickup through native reason + confirmation controls. Final APK returned to the Jobs dashboard with no active booking. Its restarted search was cancelled by the QA admin for cleanup; the earlier customer cancellation was exercised through the actual customer UI.
- **320dp / 130% trip fare PASS:** final native loading screen displays `₹1,588` on one line; a disabled loading action is opaque. See `emu-trip-fare-narrow-fixed.png`.
- **Cold offline launch PASS:** Android connectivity reported `Active default network: none`; saved login remained, with Waiting for a connection / Try again. Final banner/error/recovery bounds were separate after the layout fix. See `emu-cold-offline-spacing-fixed.png`.
- **Reconnect PASS:** restoring data/Wi-Fi loaded the saved account without signing in again. See `emu-cold-start-reconnected-final.png`.
- **History filters PASS:** Active was empty after all QA jobs were terminal/paid; Past contained cancelled jobs at ₹0 / No charge and the completed paid trip. See `emu-history-active-final.png` and `emu-history-past-final.png`.
- **GPS disable/restore PASS:** with device location disabled and the last sample older than 60 seconds, driver showed Check GPS plus Refresh GPS. Refresh was tapped; enabling location and restoring emulator fixes returned the dashboard to Ready for jobs with a fresh timestamp. No invented position was used in the app. See `emu-gps-disabled-stale-final.png` and `emu-gps-restored-final.png`.

- **Scheduled voice booking PASS:** native date/time picker and saved sites produced `PK-8F585031` for 12 October, 21:32 IST (`2026-10-12T16:02:00.000Z`). It remained scheduled with no premature driver offer. The transit-pass field contained an explicitly invalid QA placeholder; no permit verification or real transport was claimed. See `emu-scheduled-booking-final.png` and `emu-scheduled-headline-fixed.png`. Customer cancelled it through the native reason/confirmation flow; final screen scrolled to Trip cancelled with a ₹0 recorded fee (`emu-scheduled-cancel-final.png`).

## Cleanup and delivery verification

Backend cleanup confirmed both designated customer/driver QA accounts disabled, driver offline with no active booking, and zero remaining zones named `QA_EMULATOR…`. The created People test account was already disabled through UI; the test road report remains dismissed. All seven bookings are terminal, with the completed main trip retaining its labelled manual payment/photo/review audit history. The helper admin session was logged out and its private state file removed.

The isolated QA browser/instrumentation package was uninstalled. Customer/driver emulator app data was cleared after disabling test accounts; final APKs remain installed for fresh sign-in. Density, font size, rotation, GPS and network were restored. GPS-feed processes were stopped. User desktop browsers, imported designs, real pilot boundaries and other servers were preserved. Local production testing remains on port 3003; port 3002 was not touched.

The updated source was pushed to the private repository for Render deployment. The previous deployed application CSS was checked for the final fare/offline layout; final scheduled-label deployment is verified separately in the delivery log. Local and hosted pages returned HTTP 200. This checks delivery of the build, not a repeat of every UI interaction after deployment.

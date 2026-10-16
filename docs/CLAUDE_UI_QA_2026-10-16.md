# PICKR UI replacement QA — 16 October 2026

Reference implementation and all screen IDs are mapped in [the design handover](design/CLAUDE_UI_REPLACEMENT_2026-10-16.md). Test data uses the `QA CLAUDE OCT16` label. No real load, money transfer or identity document was used.

## Completed checks

- ESLint and strict TypeScript checks pass.
- Vitest: **71 tests in 11 suites pass**, including the 17ft truck waiting-rate regression and four native/web session-store cases. No catalogue/rate changes.
- Both Android flavours build successfully with Java 17 / Android SDK 35. Shared assets are bundled inside the APKs; API backend defaults to `https://pickr-xueh.onrender.com`.
- Customer and driver APKs installed and launched on the Pixel 5 API 35 ARM emulator. Native crash buffer remained empty during the tested trip.
- Web customer/driver sign-in, booking material/site/access screens, account subpages, saved sites, language sheet and Malayalam account layout inspected.
- Native driver trip: real booking accepted, reached pickup, loading timer, separate photo screen, zero-photo start blocked, file chooser opened and cancelled, two real private test-photo uploads through web, start confirmation dismissed then confirmed, delivery tracking, reached delivery, unloading confirmation, cash collection confirmation and paid driver release.
- Native foreground tracking service confirmed running during the job. Synthetic emulator GPS moved from pickup to a midpoint. The backend recorded the new sample and refreshed route distance/ETA from about 3 minutes to 2 minutes. No interpolated/mock positions were added to runtime code.
- Admin desktop layout, service-area list, system health, people search, create and edit forms inspected. A labelled customer account was created and renamed through the UI.

## Real API regression: 19 passed

The real hosted API and migrated Supabase database were used. Quotes used Mappls. Before broadcasting, the test helper checked that no non-QA driver was online.

1. Native completed trip is paid and driver reservation released.
2. Database and migration health checks succeed.
3. Real route quote and booking succeed.
4. Repeated request key returns the same booking.
5. Cancellation before acceptance records no fee.
6. Second labelled QA driver can onboard under allowed test skips.
7. Decline suppresses that search session for that driver.
8. Another driver can accept the declined request.
9. Accepted customer cancellation records the configured fee.
10. Two simultaneous accepts produce exactly one winner.
11. Driver release returns the request to search.
12. Customer cancellation after arrival is rejected.
13. Starting without photos is rejected.
14. Explicit permitted test photo skip is recorded and allowed.
15. Driver release after pickup is rejected.
16. Unpaid completion keeps the driver reserved.
17. Manual direct-UPI confirmation records the method and releases the driver; no transfer occurred.
18. Saving unchanged pilot settings succeeds.
19. Creating and removing a paused QA Bangalore boundary succeeds.

Machine-readable results: local `artifacts/claude-ui-qa/api-regression.json`. Labelled audit records and terminal test bookings are retained; test access is disabled during cleanup.

## Issues found and corrected

| Finding | Correction |
|---|---|
| Driver movement screen used the customer map height | Driver pickup/delivery maps now use the reference 340/360px heights and side-by-side navigation/call actions. |
| Main navigation appeared on focused trip stages | Trip, photo, payment and receipt stages use Back/home actions and omit the main navigation bar, matching the references. |
| Location map/caption pushed saved-site chips behind the fixed footer | Map reduced to the reference 300px, redundant caption hidden, compact labelled GPS icon control and pin summary. |
| Map default zoom covered all active cities during site selection | Site picker defaults to the first active area; the admin overview can fit all areas. |
| Paused boundaries absent from admin map | Admin area maps render paused polygons distinctly as well as active ones. |
| Same markers for all driver states | Available, busy and stale driver markers have separate visual treatments. |
| Voice map selection advanced before explicit approval | Choosing a pin and confirming a place are now separate actions. |
| Reused UI countdown/offer example values | Offer countdown derives from the real search session; distance derives from the actual route. |
| 17ft truck waiting-policy label could differ from the calculator | Both display and calculation use `waitingRatePerMinute`; regression test covers the discrepancy. |
| Browser confirmation pop-ups disrupted admin testing | Replaced with styled in-app confirmations; nested modal keyboard/Back handling targets the topmost dialog. |
| Raw sign-in server errors pushed the whole form down | Server errors are placed inside the sign-in form near its action. |
| Cross-tab language changes could mix old and new translations | Language hooks now listen for storage changes as well as same-page events. |

## Provider and environment limits

The Mappls Web SDK probe returned **401 for `http://localhost:3003`** and **200 for the Render origin and `https://appassets.androidplatform.net`**. Local route requests were also denied, while hosted quotes/routes succeeded. Local browser tests therefore used a temporary ignored proxy serving the new local UI with the real hosted API. It does not fabricate provider responses. Native maps loaded directly using the APK origin.

For direct local map testing, the Mappls Web application needs the exact local testing origin allowed; the Cloud application needs the current local server's outbound public IP allowed. The hosted configuration and APK map origin were working during this run. Coordinate entitlement for searched places remains a separate provider issue: use exact map pins/saved sites when search reports unavailable. No fallback map or invented route is used.

Firebase configuration was reported missing by health checks. Native available-driver polling/foreground tracking works independently, but closed-customer remote push and FCM device delivery are not verified or claimed.

An old browser-level admin confirmation stalled in-app browser interaction during the run. The replacement uses React dialogs; the final dialog interaction could not be verified because browser clicks still did not change the page after reload. It remains an explicit follow-up rather than an assumed pass. Physical-phone camera results, real Malayalam speech recognition, Android battery optimisation, overlay delivery and road/legal access still require field testing. Earlier October 11 QA remains historical evidence and is not counted as a fresh pass of every feature in this build.

## UX assessment

These are engineering assessments from the tested flows, not usability-study scores.

| Area | Assessment | Next improvement |
|---|---|---|
| Ease of use | 8/10 | Validate map pin selection and trade units with first-time pilot customers. |
| Understanding | 8/10 | Have Malayalam-speaking drivers review the actual wording, especially access and gross/axle weight. |
| Navigation | 8/10 | Separate stages now reduce scrolling through unrelated actions; test interruption/re-entry on physical phones. |
| UI simplicity | 8/10 | One primary action per stage, compact summaries and progressive disclosure. Document forms remain necessarily detailed. |
| Pilot readiness | Supervised testing only | Resolve local search/provider entitlements if needed, finish FCM setup if required, and run physical-phone/road trials before unsupervised loads. |

## Final delivery checks

Final production Next.js build, lint, strict TypeScript and all 71 tests passed. Both version 0.9.0-pilot (code 9) APKs built successfully. APK byte sizes, checksums, backend and source commit are recorded in local `artifacts/pickr-build-manifest.json`. No database migration was needed for this interface replacement. This report does not claim that all 63 artboards passed a pixel-by-pixel comparison or that every physical-device capability has been verified.

## Reference evidence

Selected screenshots and machine-readable API results are saved in [the QA evidence folder](design/claude-qa-2026-10-16/). These include the customer home/load/site/review screens, Malayalam account, private photo previews and the driver's real Mappls map. They record specific test states; later text/spacing corrections may be described above rather than claimed as pixel-diff certification.

Production Next.js build passes. A concurrent development/build attempt initially collided in `.next`; rerunning the production build after stopping the owned dev process passed. Final serving uses a production process on port 3003. A bundle scan found none of the configured service-role/database/admin-password/REST-map/AI secrets in the browser or APK UI assets. Mappls Web key is intentionally obtained as public client configuration from the backend.


## Additional native customer flow

The customer APK completed material → saved pickup → saved delivery → access/timing → real Mappls truck quotes → review → confirmation (`PK-5E964634`). The request visibly expanded through 5/15/20/25 km. Customer cancellation used the reason sheet and confirmation and ended at `CANCELLED` with a recorded ₹0 charge. The fixed search cancellation action was then adjusted to remain visible without scrolling. Private photos, coordinates and fares in these tests are explicitly synthetic test records, not real hauling.

## Existing service-area configuration to review

The database already had three active areas: Thrissur pilot, a Bangalore QA boundary whose *name* says inactive, and Chennai-Test. Their active flags were left unchanged. The current backend checks each endpoint against active polygons independently, allowing endpoints in different active areas. The new UI describes that behaviour accurately. If the pilot must operate exclusively within Thrissur or within one polygon per trip, review those settings/policy before accepting real loads; this UI task did not silently change coverage rules.

## Native session recovery correction

A force-stop/relaunch check returned to sign-in while the same session held by the Android host still returned HTTP 200 from the real backend. The Android host now exposes private session read/write methods; the shared client uses that store as authoritative on Android, with normal role-specific local storage in browsers. Login synchronises both stores, logout clears both, and an explicitly cleared native session cannot revive an old WebView session. Four regression cases cover these behaviours. No new authentication scheme, OTP or identity requirement was introduced.

The emulator's Chrome first-run screen requires accepting Terms, so the alternate Chrome admin interaction pass was stopped there. No Terms were accepted. Final admin dialog interaction remains unverified in that environment; the underlying account/area/settings APIs passed, and create/edit flows were exercised before the browser interruption.

Final emulator restart after the storage correction restored the existing customer account without signing in. English and Malayalam home layouts were inspected at 320dp / 130% system text size: no horizontal overflow was observed; content scrolls vertically at the larger text setting. Default size/font were restored. Warm offline recovery displayed the new C19 dialog and retry action with accurate saved-sign-in wording. Cold offline launch also passed after removing duplicate global banners above C19: its retry button remains visible. Restoring Wi-Fi/data automatically restored the account without another sign-in. Sign out cleared the native session; a force-stop/relaunch remained on sign-in. The final browser admin reload rendered the new interface, but semantic clicks still had no effect, so that final interaction check remains unverified.

## Cleanup and delivery

All four labelled QA accounts were disabled, all five test bookings are terminal or paid, both QA drivers are offline and unreserved, and no boundary with the QA run prefix remains. The helper admin session was logged out and its private token file removed. Labelled trip, payment, photo and audit evidence remains for review. Existing Thrissur/Bangalore/Chennai area flags were not changed. Cleanup results are included in the evidence folder.

The final emulator was returned to normal display/font settings and network access. Customer and driver APK app data was cleared after session checks so they start at sign-in. Only a fresh final admin-dialog browser pass and the provider/physical-device checks listed above remain; they are not represented as completed tests.

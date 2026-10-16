# PICKR build report

Updated 16 October 2026. Current UI/APK delivery is 0.9.0-pilot/code 9. See [the design handover](design/CLAUDE_UI_REPLACEMENT_2026-10-16.md) and [current QA report](CLAUDE_UI_QA_2026-10-16.md): 63 exported references, the replacement interface, 71 passing unit tests and 19 passing hosted API regression cases. Mappls works for the hosted/APK origin, while local origin/IP restrictions and coordinate-search access remain separate setup items. Firebase push and physical road behaviour are not certified. Historical setup checkpoints below are retained for context.

## Deliverables

| Surface | Delivery |
| --- | --- |
| Customer Android | `artifacts/pickr-customer-debug.apk`; `in.pickr.pilot.customer` |
| Driver Android | `artifacts/pickr-driver-debug.apk`; `in.pickr.pilot.driver` |
| Customer web | `/customer` |
| Driver web | `/driver` |
| Admin web | `/admin` |

Both current APKs are approximately 3.1 MiB, support Android 8.0+ and contain a local shared React interface. Android Java implements GPS, foreground service, notifications, overlays, speech, camera and navigation. This is a hybrid native host with a bundled interface. Shared UI and APIs can be reused on iOS; iOS native services and signing remain to be implemented.

## Implemented

| Area | Behavior |
| --- | --- |
| Access | Customer/driver name and phone entry, issued device sessions, separate role storage, logout; admin password login and bootstrap. No OTP, as requested. Disabled accounts and server-side role checks. |
| Driver onboarding | Vehicle class/registration, private registration/RC/licence/Aadhaar uploads, approval/rejection. Admin-controlled recorded testing skip allows immediate access after vehicle details. |
| Manual booking | Material/quantity, vehicle recommendation and eligible upgrades, labour/access notes, transit-pass reference, scheduled pickup, real pickup/drop search or map pins, saved sites and itemized signed quote. |
| Voice booking | Microphone intake, follow-up slot questions, corrections, native/web speech output and manual alternatives. English parser without an AI key; optional Gemini broader English/Malayalam parsing. Exact locations and final quote require confirmation. |
| Service zones | Admin draws/edits/activates/deletes polygons anywhere. Both sites must be inside active zones. Remote customer phones are allowed by default. Eligible drivers must be in an active zone. Optional device-area policy can be enabled later. |
| Dispatch | Starts at scheduled time; 5 km initial radius with 5 km expansion each minute through 25 km, expires at five minutes; operator-adjustable radius settings. Offers broadcast to eligible online, approved/test, free drivers with fresh accurate GPS. Denials remain suppressed for that search; retry creates a new attempt. |
| Acceptance | Transactional first acceptance wins. Other drivers lose the offer; busy drivers cannot accept another job. Deadline enforced server-side. |
| Driver alerts | Dashboard popup plus Android high-importance notification with view/accept/deny; optional overlay with Android permission. Online foreground service checks offers every ten seconds. Optional Firebase remote push and separate worker. |
| Tracking and maps | Real Android GPS uploads and customer tracking with sample timestamps/stale warnings. Lazy-loaded Mappls Web Maps JS v3 with traffic control, geocoding and Place Details coordinates. Live traffic routes/ETAs to pickup/destination, periodic/off-route refresh, optional predictive truck-dimension constraints, stale/outage warnings and explicit Mappls/Google external navigation. Admin-verified expiring road reports and closure/flooding avoidance requests in predictive mode; advisory reports only in standard mode. No automatic provider fallback. |
| Work stages | Accepted → pickup reached → loading timer → picked up with at least two load photos → destination reached → unloading timer → work complete → collection confirmed. Each end has 30 free minutes; waiting charges follow the existing rate rules. Photos have an audited admin-controlled testing skip. |
| Collection | Driver confirms cash/direct UPI with optional reference. Driver remains reserved until collection. Idempotent collection releases the driver; receipt/history/rating available. This records collection, not a bank transaction. |
| Recovery | Customer cancellation before pickup, no-driver retry, operator cancellation with reason, accepted-job release/restart, manual assignment to a matching free driver. Persisted stages/timers survive reloads. |
| Admin | Account creation/edit/deactivation (recoverable soft deletion), driver document review, fleet map, booking queue, assignment/release/cancellation, service pause, support phone, skip controls, search radii, zone editor, collection totals/CSV ledger and audit events. |
| Backend | Private Supabase tables/storage, restricted RPC privileges, ownership checks, signed price quotes, hashed admin passwords, hashed session tokens, login throttling, transactional driver/account guards. Credentials stay on the server. |
| Packaging | Separate debug APKs; configurable backend URL without rebuild, debug LAN HTTP support, release HTTPS enforcement, Render web-service template and portable Gradle wrapper. |

The new runtime does not seed drivers, bookings or fabricated locations. Automated PostgreSQL fixtures run only in a separate disposable local database. The initial Thrissur rectangle is editable configuration and must be reviewed; it is not an official administrative boundary.

## Verification performed

- 55 unit tests passed across pricing, vehicle selection, statuses, voice corrections, polygon, pilot, localhost/LAN/native origins and migration TLS configuration.
- ESLint and Next.js production build passed. All three web entry screens rendered at a 360 × 800 viewport with PICKR branding.
- Both APK builds passed; package IDs, labels, SDK levels and APK v2 signatures checked.
- Earlier version 0.2 APKs installed successfully together on an Android 15 emulator. Versions 0.3/0.4/0.4.1 APKs were rebuilt and their signatures/default backend checked. Emulator UI inspection was unavailable through the enabled computer-use surfaces; app launch/UI/native-service behavior is not counted as verified.
- Real local PostgreSQL tests applied all three migrations and verified concurrent first acceptance, busy-driver exclusion, ownership/stage checks, photo/skip enforcement, reservation until collection, idempotent payment, search expansion/expiry/retry, stale GPS exclusion, account guards, throttling and private privileges.
- Production dependency audit: zero known vulnerabilities at verification. Five high findings remain in development lint tooling; no forced framework downgrade was applied.
- Added `pilot:setup`: tracked atomic SQL application, first-admin creation, private secret generation and provider checks. Its actual migration/admin code passed disposable PostgreSQL tests for rollback, reruns, changed-history detection and password preservation. All three migrations have now been applied to the supplied Supabase project over verified TLS.
- Added `pilot:start`: runs backend plus dispatch/push worker together. APK version 0.4.1 defaults to a configurable backend URL, currently the detected laptop LAN address `http://192.168.0.123:3000`.

Supabase migrations, Data API reads, private storage configuration, admin login/logout, snapshots and worker requests have been verified with the supplied project. Mappls search and SDK downloads succeeded, standard Route ETA driving and trucking both pass. Setup now completes using standard mode. Search coordinates and predictive driving/trucking routes remain unavailable. Standard mode does not apply measured dimensions, predict future traffic or avoid incidents automatically. Map display on phones, road coverage, Gemini interpretation, FCM delivery and real-device GPS/permissions remain unverified. Building an APK does not establish that these field conditions work.

## Required from you to start a real trip

1. Supabase and Mappls keys are now configured privately. Enable Mappls Place Details Location Coordinates and Predictive Routing with live traffic/trucking; actual checks currently fail those entitlements. Verify web/native map domain restrictions; see `MAPPLS_SETUP.md`.
2. All three pilot migrations, first-admin bootstrap and the ten-second Cron job are installed. Review Thrissur polygon, support phone, vehicle/rate catalogue and testing skips in admin.
3. Run the backend on a reachable LAN address or HTTPS host. Set that URL on both APK sign-in screens. Keep local phones and laptop on the same network.
4. Install APKs, register actual drivers/vehicles, grant precise location/notification permissions, then go online. Use an empty truck for the first acceptance and tracking tests.
5. Complete `REAL_DEVICE_TESTING.md`, especially simultaneous acceptance, screen-off GPS, notification actions, lost connection, two photos and collection/driver release.
6. Optional: provide both-client `google-services.json` and server Firebase service-account JSON, rebuild APKs, and run the separate push worker. Optional Gemini key improves language handling. Neither is required for manual booking and online-driver polling alerts.

Provider outages or missing keys return explicit failures; there is no demo mode to mask them. Phone web GPS generally needs HTTPS, so use the APK for driver background testing.

## Remaining scope and discrepancies

- “All possible features” from Porter/Rapido is not a finite MVP requirement. The specified freight workflow is implemented; wallets, referral rewards, marketplace payouts, bank settlement, multi-stop/multi-truck dispatch, return-load matching and automated rescheduling are not implemented.
- Low-poly 3D vehicle models, embedded native turn-by-turn/offline navigation and a provider incident feed are not included. Mappls traffic control and traffic ETA requests are implemented. Assigned routes include truck measurements when entered; provider coverage and road legality still require field checks. Local road reports are operator verified and expire after two hours. Quotes before assignment use general driving estimates.
- Tracking uses authenticated polling, rather than Supabase Realtime subscriptions. Web refresh is three seconds and native GPS/offer polling is ten seconds; map samples are actual observations, not interpolated motion.
- No-OTP login does not verify phone ownership and can allow impersonation by someone entering another pilot participant's number. OTP and session management are required before opening access broadly.
- Android notifications/background location depend on permissions, battery restrictions, connectivity and force-stop state. Firebase does not guarantee delivery. Physical pilot-phone testing remains necessary; no iOS binary is supplied.
- Account deletion is deactivation, preserving operational records. Document retention, production signing/updates, backups, monitoring and deployment ownership still need operational decisions before public launch.
- Testing skips must be disabled once onboarding and load-photo checks are validated. Collection confirmation is manual; no payment gateway is connected.

Follow the README setup sequence. This report records what is built and what still needs configuration/testing; it does not mark the pilot ready for unsupervised hauling.

## Mappls change verification

Added migration `20261010020000_mappls_navigation.sql`, tracked by setup. Local PostgreSQL checks verify shared route leases, throttled refreshes, preservation of the last route on outage, late-response rejection after a stage change, active-trip measurement protection and private cache/report privileges. Fifteen new tests cover provider requests, polyline6 decoding, Kerala scheduled departure times, missing coordinate entitlement and no silent second-provider fallback. Provider/physical-device verification remains pending keys; read `MAPPLS_SETUP.md`.

Version 0.4.0 APK builds and Next.js production build passed after the Mappls migration. Bundled native UI is approximately 262 KB JavaScript plus 11 KB CSS (before gzip), down from the earlier Leaflet bundle. Mappls SDK/maps are loaded over the network on demand; their download size is separate from the APK. The supplied credentials have now been saved to the ignored private environment file. All three cloud migrations applied successfully; the first admin and Cron job are installed. A Supabase root CA was added to keep database TLS verification enabled. Setup verified Data API/private storage before stopping at missing Mappls Location Coordinates entitlement; independent traffic/trucking checks returned ASSET_ACCESS_DENIED.

## Credential activation checks

Backend is running locally with the dispatch/routing worker. Actual HTTP checks passed for health, admin login, snapshots, admin management reads, authenticated map configuration and worker execution. The temporary admin verification session was logged out. No fabricated customers, drivers or trips were inserted. Mappls geocoding and Web Maps JS download returned HTTP 200. Place Details omitted usable coordinates; predictive live traffic driving and trucking requests both returned HTTP 401 ASSET_ACCESS_DENIED. API entitlement changes are required before booking can work. Admin password is stored only in `.env.local` as ADMIN_BOOTSTRAP_PASSWORD.

## Current-allocation pilot verification (11 October 2026)

Standard Mappls traffic ETA mode is configured and the production backend is running on localhost/LAN port 3000 with its worker. An authenticated admin quote request passed against the real Supabase project and Mappls route API: 1.1 km, 3 minutes, 21 route geometry points, three eligible vehicle options and a signed quote. No booking, driver or customer records were created by this check. Both APKs are rebuilt as 0.4.1-pilot (version code 4), approximately 2.6 MB each. Address search remains unavailable without coordinate entitlement; use exact map pins. Browser map rendering and physical-phone behavior remain acceptance checks, not passed claims. Firebase is still unconfigured; pilot driver notifications use the running online foreground service.

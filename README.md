# PICKR — real-device freight pilot

One shared React interface and Next.js backend. Customer web `/customer`, driver web `/driver`, admin web `/admin`. Two sideloadable Android packages contain the interface locally and add native GPS, request notifications, optional overlays, microphone/speech and camera/file handling.

## Current pilot delivery

Hosted web: https://pickr-xueh.onrender.com (`/customer`, `/driver`, `/admin`). Current APKs are **0.9.0-pilot / code 9**, about 3.1 MiB each, with this HTTPS backend embedded. The customer, driver and admin interfaces now follow the supplied Claude design set. See [UI handover](docs/design/CLAUDE_UI_REPLACEMENT_2026-10-16.md) and [current QA report](docs/CLAUDE_UI_QA_2026-10-16.md) for coverage, necessary prototype adaptations and remaining provider/physical-device checks. The [October 11 Android report](docs/ANDROID_QA_2026-10-11.md) is historical evidence.

## Start local testing

**Quick setup:** fill `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `MAPPLS_REST_KEY`, `MAPPLS_WEB_KEY` and `ADMIN_BOOTSTRAP_PHONE` in `.env.local`, then run `npm run pilot:setup`. It creates missing private secrets/admin password in that file, applies the tracked pilot migrations transactionally, creates the first admin, installs Cron if available, and verifies Supabase/private storage/Mappls access. It does not print secrets. The migration runner records checksums and refuses to overwrite an untracked existing pilot schema or edited migration history. `DATABASE_URL` is setup-only, never included in APKs; use Supabase's direct or session-pooler connection (not transaction pooler port 6543). Remote SQL uses verified TLS; set `DATABASE_SSL_CA_FILE` to a trusted CA certificate if your project needs one.

Start the web backend **and dispatch/routing worker together** with `npm run pilot:start`. This requires valid configuration; it stops early when keys are missing. For production: `npm run build`, then `npm run pilot:start -- --production`. The worker handles dispatch even if Cron is unavailable and no screens are open, refreshes Mappls routes/ETAs and handles FCM when configured. Stop both with Ctrl+C. Existing standalone commands remain available below.

Choose the automated setup above **or** the manual SQL steps below. Do not replay the SQL manually after `pilot:setup` has applied it.

1. `npm ci` (Node 24+ recommended).
2. Copy `.env.local.example` to `.env.local` **only if you do not already have an environment file**, then set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)
   - `MAPPLS_REST_KEY` (server only) and `MAPPLS_WEB_KEY` (restricted browser-visible maps key); see `docs/MAPPLS_SETUP.md` for API entitlements and WebView domain restrictions.
   - `ADMIN_BOOTSTRAP_PHONE` (10 digits), `ADMIN_BOOTSTRAP_PASSWORD` (at least 10 characters)
   - Random private `QUOTE_SIGNING_SECRET` and `WORKER_SECRET`.
3. In Supabase SQL Editor run **in order**:
   - `supabase/migrations/20261010000000_real_pilot.sql`
   - `supabase/migrations/20261010010000_pilot_guards.sql`
   - `supabase/migrations/20261010020000_mappls_navigation.sql`
   - `supabase/migrations/20261011000000_release_before_loading.sql`
   - `supabase/migrations/20261011010000_record_cancellation_fee.sql`
   - `supabase/pilot-cron.sql` (enable Cron integration if needed).
   These create private tables, a private upload bucket, transaction functions and a dispatch job. Do not run the old demo seed. Existing legacy schema is preserved; the new runtime uses only `pilot_*` tables.
4. `npm run pilot:start`. Visit `http://localhost:3000/admin`, sign in using the bootstrap credentials, review the initial Thrissur service rectangle (remote customers are allowed), set support phone, and confirm test skips are enabled.
5. Visit `http://localhost:3000/customer` and `http://localhost:3000/driver` in separate browser tabs. Customer/driver tokens are stored separately. No drivers/bookings are preloaded.

## Install APKs

The delivery files are `artifacts/pickr-customer-debug.apk` and `artifacts/pickr-driver-debug.apk`. Enable installation from your chosen file manager and install each file. Application IDs:

- `in.pickr.pilot.customer`
- `in.pickr.pilot.driver`

Android 8.0+ (API 26) required. Both apps can be installed on the same phone. They are pilot/debug-signed builds; retain the signing key on this build machine for compatible updates. Neither APK contains server credentials.

New APK builds preconfigure `PICKR_BACKEND_URL` (if set), otherwise a non-localhost `PUBLIC_APP_URL`, otherwise an automatically detected private LAN address. The current delivery defaults to `https://pickr-xueh.onrender.com`. For local testing, set a reachable LAN URL, put phones and laptop on the same Wi-Fi and allow the backend port through the laptop firewall. To change the address, expand **Backend connection** on the APK sign-in screen, or set `PICKR_BACKEND_URL` and rebuild. Saved overrides take precedence over the compiled default. Android pilot builds allow local HTTP; use HTTPS before using public networks. Release build configuration blocks HTTP.

The native interface is bundled and does not load a hosted website. Booking, maps, storage and dispatch still need a reachable backend and internet. No fabricated data is used when these services are unavailable.

## Rebuild Android

Install JDK 17, Android SDK platform/build tools 35, and set `JAVA_HOME` / `ANDROID_HOME` (Android Studio can supply them). Run `npm run android:build`. The Gradle wrapper is included. The script also recognizes the temporary toolchain installed during this implementation if it is still present. It bundles the shared UI, compiles both variants, and copies both APKs into `artifacts/`.

## Driver operation

Register a real vehicle type/number and actual truck height, width, length, maximum gross weight and axle load. Submit registration, RC, licence and Aadhaar images/PDFs for admin approval, or use the explicit testing skip if enabled. Test drivers can receive requests immediately. Enable precise GPS and notification permission, then go online.

The Android location foreground service shares GPS and checks offers every 10 seconds while online, including during navigation and screen-off operation. It displays an ongoing notification. New requests use a high-importance notification with view/accept/deny actions; an optional overlay requires the driver's explicit Android setting. The service validates every response with the backend. Foreground web screens refresh every 3 seconds; GPS is uploaded at most once every 10 seconds. Web background GPS is not promised.

Sequence: accept → reached pickup → 30-minute free-loading timer → two load photos (or recorded test skip) → picked up/start trip → reached destination → 30-minute free-unloading timer → work complete → confirm cash/direct UPI collection. Driver remains reserved until collection, then becomes eligible for new offers while still online.

If Android force-stops the app, revokes permissions, disables GPS, or restricts the service, reopen the app. The server excludes stale locations (older than 90 seconds) and poor accuracy (>150 m); customer tracking labels samples older than 60 seconds as stale. No extrapolation is used. Device-specific battery/permission behavior requires actual phone testing.

## Maps and navigation

Mappls is the primary and only automatic mapping provider. Live trip routes/ETAs refresh from driver GPS; recorded truck measurements enable restricted truck routing. Stale estimates remain labelled during outages. External Mappls/Google navigation is an explicit driver option. Admin-verified local road reports supplement traffic estimates. See `docs/MAPPLS_SETUP.md` for the full behaviour, required entitlements, test plan and incident-feed limitation.

## Optional remote push and voice

Native online-driver alerts work without Firebase because the foreground service polls authenticated offers. To add FCM (including customer notifications when the app is closed):

1. Register **both** application IDs in one Firebase project.
2. Put a `google-services.json` containing both Android client configurations at `native/android/app/google-services.json`, then rebuild both APKs.
3. Set server `FIREBASE_SERVICE_ACCOUNT_JSON` to one-line service-account JSON and ensure FCM HTTP v1 is enabled. Keep this key out of APKs and Git.
4. `npm run pilot:start` starts the worker alongside the backend. Alternatively run `npm run worker` separately. It dispatches, refreshes due live routes and drains the push outbox every 15 seconds. The standalone `npm run dev` and `npm run start` commands do not start a worker. On other hosted setups run it as a persistent background worker or schedule authenticated `POST /api/worker`.
5. Grant notification permission in each app. Remote push is optional; delivery and timing are not guaranteed by Android/FCM.

English structured voice parsing works without an AI key. Native speech recognition uses the phone's recognition service; missing language packs/network can prevent transcription. `GEMINI_API_KEY` enables broader English/Malayalam understanding. Follow-up questions have typed/tappable alternatives; exact locations must be confirmed with search/pins. Vehicle selection and pricing always run in code.

## Hosting and iOS

`render.yaml` supplies a Next.js web service template and starts the dispatch/push worker alongside the web process. Apply migrations with `npm run pilot:setup` from this machine first. Set environment values in Render, set `PUBLIC_APP_URL` to its HTTPS URL, then set `PICKR_BACKEND_URL` and rebuild for automatic APK connection (or use the in-app override). The repository is deployed at `https://pickr-xueh.onrender.com`, with the application and worker configured on Render. Render plans that suspend while idle are unsuitable for reliable pilot dispatch.

The UI uses no Android-only imports. Platform functions are isolated in `src/lib/pilot/client.ts`; Android implements them in `native/android`. An iOS WKWebView/Capacitor host can reuse the bundled interface and APIs, but requires Swift implementations for permissions, background location, APNs/FCM, speech, camera and external links. No iOS binary has been built.

## Verification

- `npm test` — pricing, selection, status, service polygons, voice corrections and pilot rules.
- `npm run lint`, `npm run build`, `npm run native:bundle`.
- `npm run test:db` — real PostgreSQL migration/concurrent acceptance/state/payment/privilege tests in a new disposable local database. Set `POSTGRES_BIN` if PostgreSQL is not under the Homebrew path. It does not use production data.
- `npm run test:setup` — exercises the actual setup runner against disposable PostgreSQL: rollback, safe reruns, history checksum checks and first-admin creation without resetting existing credentials. `POSTGRES_TEST_URL` optionally selects a local test server, never the production project.
- Follow `docs/REAL_DEVICE_TESTING.md` before real loads.

See `docs/BUILD_REPORT.md` for implementation scope, discrepancies and pending configuration. Full road testing and cloud-provider checks require your keys, a running migrated Supabase project, and pilot phones.

## Testing with the current Mappls allocation

`MAPPLS_ROUTING_MODE=standard` uses the enabled Route ETA API Traffic. Select both sites with **Choose on map** while searched-place coordinates remain unavailable. This mode provides current traffic ETA on the default route, including for scheduled quotes; it does not apply measured truck dimensions, predict future traffic or automatically avoid reported incidents. `predictive` is an explicit opt-in after provider access is enabled. See `docs/REAL_DEVICE_TESTING.md` for the field checklist.

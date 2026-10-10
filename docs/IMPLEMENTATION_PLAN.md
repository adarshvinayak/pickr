# Real-device pilot implementation

User instructions on 10 October 2026 supersede the original demo PRD: two Android APKs, customer `/customer`, driver `/driver`, admin `/admin`, persistent Supabase, no seeded drivers or simulated GPS/routes.

## Delivery order
1. Durable database, issued device sessions, admin authentication and permissions, configurable service polygons.
2. Server-priced booking, five-minute dispatch, transactional acceptance, driver reservation through collection.
3. Customer manual/voice intake, real location picker, tracking, cancellation, history; driver onboarding, offers, loading photos, timers, collection.
4. Admin boundaries, accounts/approvals, live trip monitoring, assignments, audit and configuration.
5. Two Android variants with bundled shared React UI and native GPS service, alert notifications/optional overlays, speech, camera/file chooser and navigation intents.
6. Build APKs and web, test race/state/privacy/boundary rules, document setup and device test gates.

## Explicit limitations and discrepancies
- Phone entry without OTP proves no ownership. It is deliberately pilot-only; device tokens enforce access after entry, but another person can enter the same phone and sign in.
- Android packages use a bundled React interface inside a native Android host, with actual native services; this is a hybrid app, not a Kotlin-only UI.
- Android permissions, force-stop, battery restrictions and connectivity can prevent alerts/tracking. The UI must show last GPS time, never extrapolate.
- Skips are admin-configurable and recorded; initial testing enables skips. Skipping documents still requires a real vehicle type/registration number.
- Driver remains reserved after unload until collection is confirmed.
- No fake provider fallback. Mappls failure blocks quote/search; service polygons are real configuration, not invented driver supply.
- “All possible features” is unbounded: delivery focuses on the specified complete workflow and useful freight-app controls; passenger rides, wallets and referral systems are outside this pilot.

The user selected Mappls as the primary provider. See MAPPLS_SETUP.md for live routing/ETA, truck measurement, stale-cache, traffic controls and operator road report behaviour. Original Mapbox design references are historical.

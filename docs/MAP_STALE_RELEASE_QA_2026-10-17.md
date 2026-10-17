# Map failure investigation — 17 October 2026

## Observed root cause
The user's failing Render customer tab was running an obsolete UI bundle. Its accessibility tree showed the old inline location picker, reused `pickr-map-r7` container ID, three duplicate attribution/control groups, and `Cannot read properties of undefined (reading 'destroy')`. Current source and build 14 instead use a new UUID child for every map instance and a full-screen location picker.

Reloading that exact browser tab loaded the current full-screen picker, preserved the booking draft, and rendered the road map under a UUID container with a single set of controls. No service-worker implementation exists in this repository. An already-open JavaScript application continues running its original code after a server deployment; Retry map only reconstructs the map inside that same old bundle.

The downloaded Mappls Web SDK 3.0 source confirms that its constructor removes the previous map when container IDs match. Its underlying map `remove()` deletes `handlers`; calling it again throws at `handlers.destroy()`. Unique container IDs address that constructor path. This update additionally makes removal idempotent on each owned instance, including when the provider initiates removal.

## Changes
- Keep unique per-instance UUID map containers.
- Guard each map instance's remove method against repeat calls.
- Add a no-cache release endpoint and web update notice, checked on focus, visibility change and every minute. Build versions derive from the Git commit; APKs do not offer a misleading browser refresh update.
- Do not forcibly reload an active trip or erase a booking draft.
- Android release 0.9.6-pilot, version code 15.

## Verification
- 84 tests across 15 suites passed, including repeated removal and remount regression coverage.
- TypeScript, affected-file ESLint and production Next build passed.
- Build 14 Android customer: real Render backend, real Mappls tiles, six repeated full-screen close/reopen cycles passed. Captured WebView exceptions and network failures; only unrelated appassets favicon DNS failures occurred, no map-resource failures or destroy exceptions.
- The failing web tab was refreshed and its current road map visually verified; its original outside-zone selection was preserved, not confirmed or changed.
- Final build 15 emulator verification is recorded in the release manifest after completion.

## Scope and limits
No test bookings were dispatched, no real trips were modified and no service zones were changed. Shared map construction is used by customer, driver and admin. Provider resource outages and ungranted API entitlements remain separate from this lifecycle fault; the application still reports genuine map loading failures. Existing older APK installations require installing the latest APK. Old web bundles cannot receive the new update notice retroactively: reload those tabs once.

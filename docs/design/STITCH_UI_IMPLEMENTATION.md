# PICKR Stitch UI implementation

## Changes

- Canonical customer palette: rust #a23a00, pale #f5fafe canvas, slate #171c1f text, white bordered panels and dark fare total.
- Locally bundled variable Space Grotesk, Noto Sans, Noto Sans Malayalam and JetBrains Mono fonts, plus a 13 KB subset of Material Symbols Outlined icons, with their licenses. No Google Fonts runtime dependency or extra rendering library.
- Customer home, sign-in, bottom navigation and trip list share the design system. The new customer account export drives saved sites, preferences, payment information and support.
- The new driver account export drives real profile/vehicle data, recorded trip/collection totals, routing measurements, document viewers, GPS/alert setup and support.
- The new driver console/request export drives the status strip, online/offline switch, actual daily work summary, dark cargo panel, pickup/delivery manifest and accept/decline request dialog. Loading uses the new dark timer and document/photo panel styling; payment is presented after completed unloading.
- Booking has six separate steps: load → pickup → delivery → site details → truck → review. Exact-site selections and form values persist while moving between steps; per-account session drafts survive leaving the booking flow and refresh. Completed bookings and sign-out clear the draft.
- Review presents the route, selected truck, fare breakdown, waiting policy, and cash/direct UPI collection. Quotes are recalculated after input changes; requests retain their existing server idempotency key.
- Driver onboarding has three steps: vehicle → measurements → documents, retaining the explicitly labelled test skip.
- Driver availability is separated from current trip work. Newly accepted jobs open the work screen automatically. Trip phases have a progress rail, location map, stage-specific actions, loading/unloading timers, photo uploads, payment confirmation, and contact/navigation controls.
- Main customer and driver actions have Malayalam alternatives; language preference persists. Technical provider details and some secondary text remain English, pending local-language copy review.
- The new admin export supplies the desktop sidebar, live map and adjacent dispatch queue/table. Functional service areas, driver review, people, trip ledger, settings, road issues and activity retain their existing server actions.
- Responses from replaced sessions are ignored, with regression coverage for late unauthorized replies and late snapshots.
- Revoked/expired sessions return to sign-in instead of being presented as network outages.
- Map text no longer promises an unavailable traffic overlay control.

## Validation

- ESLint: passed.
- Vitest: 58 tests across 9 suites passed.
- Next production build: passed; customer/driver/admin first-load JavaScript approximately 132 KB.
- Native Vite bundle and both Gradle APK builds: passed. APK version 0.5.0-pilot, version code 5; default backend https://pickr-xueh.onrender.com; approximately 3 MB each.
- Browser: customer sign-in, step progression, back navigation, draft restoration, Malayalam rendering, real customer/driver profile data, driver availability and admin dispatch layout verified. A clearly labelled mock trip completed booking → acceptance → pickup/loading → delivery/unloading → cash confirmation; the driver was released afterward. Synthetic GPS and the explicit testing photo skip were used; no real load or financial payment occurred.
- Physical Android GPS, camera permissions, overlays and remote push were not newly tested during this UI change. Existing Mappls entitlement and Firebase limitations are unaffected.

See STITCH_MISSING_SCREENS.md for the missing-screen inventory and a brief ready to send to Stitch. Placeholder marketing data, alternative visual themes and the missing 3D placeholder were not imported into the functional app.

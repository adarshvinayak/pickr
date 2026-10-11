# PICKR: Stitch coverage and next design request

The original export has four primary customer designs: sign-in, load/site setup, review/request, and live tracking. Three more are alternative visual directions; the eighth repeats sign-in and has no screenshot. The 11 October additions now cover customer account, driver account/vehicle profile, driver console/request, loading/collection, and admin operations/polygon dispatch. These five additions are integrated into the working app. The implementation uses the canonical rust-orange customer palette, rather than mixing the alternative styles.

## Send this to Stitch

Extend the existing PICKR construction logistics suite. Keep primary #a23a00, canvas #f5fafe, ink #171c1f, white bordered panels, Space Grotesk headings, Noto Sans body, and Noto Sans Malayalam. Use clear Malayalam and English versions, 56px actions, readable 16px text, and one main action per screen. Design for 360px Android phones, responsive web, and future iOS. Avoid invented fleet counts, ETAs, discounts, revenue or approval claims.

### Remaining customer screens needed

1. Home: greeting, active service areas, Speak to book / Book a truck; current trip card when a booking exists. Home / Trips / Account bottom navigation.
2. Separate booking steps: load and quantity; pickup; delivery; site details; vehicle selection; review. Back preserves input. Show exact quantity units and cash/direct UPI after delivery.
3. Location picker: search results, saved sites, map pin and site name; loading, denied GPS, search unavailable, no results, and outside-service-area states. Both sites must be inside an active zone; customers may book remotely.
4. Voice conversation: microphone idle/listening/error, typed answer fallback, one follow-up question at a time, exact-site confirmation, final review. Malayalam / English speech choice.
5. Truck selection: eligible vehicles, capacity, recommendation, real quote; radio-style selected state. Supply lightweight low-poly truck assets separately, matching the configured vehicle catalogue. Existing export references a placeholder asset; no usable 3D models were provided.
6. Search states: searching radius, remaining time, scheduled booking, no driver found, retry, cancellation with applicable fee.
7. Trips: empty state, pending/active/completed/cancelled lists and paid/unpaid labels; trip receipt and feedback.
8. Connectivity interrupted, session expired, help detail and paused-service states. Customer account is now supplied.

### Remaining driver screens needed

1. Sign-in and three-step setup: vehicle type/registration; actual truck measurements; document upload and approval status. Test-only skip must be visibly labelled; skip does not mean verified approval.
2. Permission denied and notification/overlay setup states; console and vehicle profile are now supplied.
3. Request expired/already-taken states; the main incoming request is now supplied.
4. Heading to pickup, delivery arrival, separate unloading, job finished/paid, and return-to-availability states. Loading and collection visual panels are now supplied; the functional stages remain separate.
5. Upload failure/retry, GPS permission denied, stale tracking, lost connection, trip release/cancellation and history.

### Remaining admin screens needed

The operations/map/dispatch shell is supplied. Dedicated designs are still needed for polygon editing/undo/save, driver document review/approval, people management, settings, road reports, audit/activity, and narrow mobile variants. These functional controls exist in the app using the supplied design system.

## Implemented adaptations

The missing screens have functional layouts using the exported design system. Booking is six sequential steps, driver setup is three steps, current driver work opens separately, and customer navigation has Home / Trips / Account. Main booking and driver actions have Malayalam alternatives. Technical provider diagnostics remain available in English; Malayalam wording should be reviewed by a local speaker before wider rollout.

Do not design predictive routing, fastest truck-safe routing, guaranteed traffic-event avoidance, verified phone login, or reliable remote push as available features: these require additional provider access/configuration. Mappls standard traffic ETA and map pins remain supported. Fare rules remain unchanged. The subsequent QA pass applied SQL function migrations to fix driver release before departure and persistence of existing cancellation fees; see the comprehensive QA report.

## Necessary changes to new exports

Preserved actual account/vehicle/site data and actual trip totals instead of sample names, fleet counts, ratings or GPS-health claims. No weighbridge sensor feed, automatic e-waybill sync, document expiry checking, inspector digital signatures, permit verification, or truck 3D assets were supplied. Those placeholder claims are omitted. Payment remains after delivery/work completion, and free waiting remains 30 minutes per loading/unloading stage, rather than the conflicting collection-before-unloading and 15-minute admin examples. Uploaded documents are labelled uploaded, not automatically verified. Native permission controls open configuration instead of claiming the permissions are enabled. Self-service profile name/phone editing is not exposed; admins retain existing account editing.

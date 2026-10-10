# PICKR: Stitch coverage and next design request

The supplied export has four primary customer designs: sign-in, load/site setup, review/request, and live tracking. Three more are alternative visual directions; the eighth repeats sign-in and has no screenshot. Driver and admin designs are absent. The implementation uses the canonical rust-orange customer palette, rather than mixing the alternative styles.

## Send this to Stitch

Extend the existing PICKR construction logistics suite. Keep primary #a23a00, canvas #f5fafe, ink #171c1f, white bordered panels, Space Grotesk headings, Noto Sans body, and Noto Sans Malayalam. Use clear Malayalam and English versions, 56px actions, readable 16px text, and one main action per screen. Design for 360px Android phones, responsive web, and future iOS. Avoid invented fleet counts, ETAs, discounts, revenue or approval claims.

### Customer screens needed

1. Home: greeting, active service areas, Speak to book / Book a truck; current trip card when a booking exists. Home / Trips / Account bottom navigation.
2. Separate booking steps: load and quantity; pickup; delivery; site details; vehicle selection; review. Back preserves input. Show exact quantity units and cash/direct UPI after delivery.
3. Location picker: search results, saved sites, map pin and site name; loading, denied GPS, search unavailable, no results, and outside-service-area states. Both sites must be inside an active zone; customers may book remotely.
4. Voice conversation: microphone idle/listening/error, typed answer fallback, one follow-up question at a time, exact-site confirmation, final review. Malayalam / English speech choice.
5. Truck selection: eligible vehicles, capacity, recommendation, real quote; radio-style selected state. Supply lightweight low-poly truck assets separately, matching the configured vehicle catalogue. Existing export references a placeholder asset; no usable 3D models were provided.
6. Search states: searching radius, remaining time, scheduled booking, no driver found, retry, cancellation with applicable fee.
7. Trips: empty state, pending/active/completed/cancelled lists and paid/unpaid labels; trip receipt and feedback.
8. Account, help, connectivity interrupted, session expired and paused-service screens.

### Driver screens needed

1. Sign-in and three-step setup: vehicle type/registration; actual truck measurements; document upload and approval status. Test-only skip must be visibly labelled; skip does not mean verified approval.
2. Home: online/offline, current GPS health, vehicle, current job, edit vehicle, notification and optional overlay setup.
3. New request dialog: material and quantity, pickup/delivery, fare, accept/decline, expired/already-taken state.
4. Work screens: heading to pickup with external navigation; pickup arrival; loading with 30-minute timer and at least two photos (test skip); journey with GPS; delivery arrival; unloading with 30-minute timer; finish work; cash/UPI received confirmation; available for next job.
5. Upload failure/retry, GPS permission denied, stale tracking, lost connection, trip release/cancellation and history.

### Admin screens needed

Responsive desktop sidebar with Trips, Service areas, Drivers, People, Settings, Road issues, Activity. Include map/fleet overview; trip detail/manual dispatch; polygon editing with undo/save/paused-zone states; driver approval/document viewer; customer/driver/admin management; pricing/operational settings already exposed by the backend; verified road reports; audit log and export. Provide narrow mobile equivalents.

## Implemented adaptations

The missing screens have functional layouts using the exported design system. Booking is six sequential steps, driver setup is three steps, current driver work opens separately, and customer navigation has Home / Trips / Account. Main booking and driver actions have Malayalam alternatives. Technical provider diagnostics remain available in English; Malayalam wording should be reviewed by a local speaker before wider rollout.

Do not design predictive routing, fastest truck-safe routing, guaranteed traffic-event avoidance, verified phone login, or reliable remote push as available features: these require additional provider access/configuration. Mappls standard traffic ETA and map pins remain supported. No backend tables or fare rules changed for this UI update.

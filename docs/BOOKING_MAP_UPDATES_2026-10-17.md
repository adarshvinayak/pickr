# Booking, map and driver setup updates — 17 October 2026

## Actual cause of the recurring map error

The earlier teardown guard did not cover Mappls's constructor. Inspection of the currently served official SDK showed that it compares the new container ID with its previous map's container ID and calls `remove()` on that previous map when they match. Its removal method deletes interaction handlers. Reusing a React map ID after cleanup can therefore remove the same map twice and throw the reported `destroy` error during the next construction.

Each SDK initialization now creates its own child container with a fresh UUID, independent of React mount IDs or retry counters. Existing asynchronous teardown guards remain. A regression test models the provider's constructor behaviour and verifies that reopening a removed map cannot enter its double-remove path. The shared component covers admin, customer and driver maps.

## Requested changes

- Location picker opens with search, recent trip locations and saved sites. Near-identical coordinates are deduplicated. Select on map / full-screen icon opens a full-viewport pin map with address card, current-location control, Close and Confirm. Back/Close cancels an unconfirmed pin; selection is committed only by Confirm. Confirm is disabled while moving or resolving the address.
- Reverse addresses include available small-neighbourhood/sub-locality details before the road, then remaining locality/village/district/state/PIN. House numbers and store/house names remain excluded. Provider detail varies by coordinate.
- Past completed, cancelled and expired trips offer Repeat this trip. It retains material, quantity, sites, labour/access choices and notes, requests a fresh quote, preserves the prior truck when eligible and opens review directly. It does not create a booking until final confirmation. Pickup time resets to Now; an old transit pass is not reused. Existing active work prevents starting another repeat.
- Scheduling offers seven date tabs (today plus the next six days), with hour/minute/AM-PM rollers. Times are explicitly India Standard Time; past times cannot proceed. Both manual and voice scheduling use the picker.
- Customer tracking shows the driver stage and arrival estimate above the map. Driver navigation layout remains separate.
- Refresh route / ETA is renamed Update route and arrival time. It requests a new navigation estimate using the latest shared driver GPS; it does not start external navigation or change the quoted fare.
- Driver onboarding no longer resets its scroll/back handlers on every snapshot/callback change. Submission and Skip await the refreshed profile before leaving setup. A fresh QA driver successfully skipped to Jobs and remained there across subsequent refreshes.

## Validation and limits

84 tests / 15 suites, lint and TypeScript pass. Tests include the SDK same-ID double-remove regression, repeat-trip data safety, granular reverse address ordering, tracking-header order and seven-date/time-roller markup. Web and both native builds are checked separately during delivery.

Local UI checks exercised past-trip Repeat to review, seven date choices, roller selection, recent locations, full-screen dialog and fresh driver pilot skip. The local Mappls origin/server IP lacks the required access, so local visual tests do not certify real map tiles or route calls. A repeated-trip quote on the allowed Render backend returned a real 1.5 km route and three eligible trucks. Two non-QA drivers were online during QA, so no synthetic dispatch was broadcast into their work queue. Tracking layout was checked with a rendering regression test without altering real trips.

Latest delivery is 0.9.4-pilot / Android version code 13. Install the new APKs to receive bundled UI changes; browser users must reload after deployment. Artifacts retain only the two current APKs and the matching build manifest. Mappls coordinate-search entitlements are still a separate configuration limitation; recent places and exact map pins provide alternatives.

## Delivery verification

- Real Mappls maps loaded in Android full-screen selection. Closed and reopened the map three times without a destroy error; moving and confirming the pin returned the detailed address to the pickup selector.
- Android Repeat opened Review directly and obtained a fresh Render quote (₹1,588 at the test time), retaining load/sites/truck. No new booking was submitted.
- Live admin switched repeatedly between Drivers and Service areas with fresh UUID containers and no captured console errors.
- Fresh driver pilot skip reached Jobs and remained there across polling refreshes.
- Missing full-screen/replay/history font ligatures use small vector fallbacks; the current-location control has explicit contrast.

# PICKR browser mock test

Test date: 11 October 2026 (IST). Production build on localhost:3000, real Supabase database/storage and real Mappls REST routing. An ignored, local-only proxy on localhost:3001 injected a visibly labelled GPS control. No production GPS simulation or fake routing response was added. There was no actual transport or money transfer.

## Results observed in the browser

| Check | Result |
| --- | --- |
| Customer name/phone sign-in | Passed with clearly labelled test account |
| Driver sign-in, vehicle selection, document skip | Passed for two test drivers with matching tipper class |
| Driver online with fresh GPS | Passed; database confirmed changing coordinates |
| Manual pickup/drop capture | Passed using mock GPS through the normal My location buttons |
| Quote and vehicle recommendation | Passed; real Mappls route: 1.1 km, about 3 minutes; signed fare ₹1,905 |
| Request popup | Passed on both nearby driver tabs |
| Simultaneous acceptance | Passed; exactly one driver assigned, accepted/expired offer records confirmed; losing driver's popup cleared |
| Customer acceptance and stage updates | Passed through normal polling |
| Driver GPS during trip | Passed; changed coordinates persisted and GPS age refreshed on customer screen |
| Pickup and destination ETA | Passed with real Mappls current-traffic ETA; moving ETA hidden during loading/unloading |
| Pickup loading timer | Passed; 30-minute countdown visible on both apps |
| Load-photo upload and minimum | Passed with two labelled mock PNGs in private storage; one photo left start disabled, two enabled it; no photo skip used |
| Start trip and destination arrival | Passed; customer changed to transit, then unloading |
| Unloading timer | Passed; separate 30-minute countdown |
| Work completion and payment reservation | Passed; driver remained reserved while collection pending |
| Manual cash confirmation | Passed; collection record created and driver released; no actual money moved |
| Customer feedback | Passed; feedback saved |
| Another request after payment | Passed; released driver received the next request |
| Driver release/reassignment | Passed; accepted driver released with reason, search restarted and other driver received an offer |
| Driver rejection | Passed; popup cleared and declined offer persisted |
| Search expansion | Passed; observed 5 → 10 → 15 → 20 → 25 km at successive minute boundaries, with no repeated declined alert |
| Five-minute timeout | Passed; UI showed No truck found and retry control. Audit confirms expiration 301.379 seconds after restarted search |
| Browser refresh | Passed; sign-in and active search restored from persisted state |
| Outside-zone destination | Passed; quote rejected with service-area message |
| Remote customer | Passed quote check: both sites inside Thrissur, simulated device outside; quote accepted |
| Outside-zone driver going online | Passed; service-area error and driver remained offline |
| Typed voice intake | Passed parsing material/quantity/sites and a follow-up quantity question. Microphone/speech capture not exercised |

## Provider blockers

- **Web map rendering fails.** Browser displays “Mappls could not load.” Current local HTTP domain restrictions remain unresolved. Map pin selection, driver marker motion and the traffic overlay could not be verified.
- **Place search cannot resolve usable coordinates.** Searching Thrissur railway station displays “Mappls Place Details needs Location Coordinates access.” Provider access must be corrected; the suggested map alternative is also blocked in this environment.
- Current standard routing returned traffic ETA, but predictive v2, fastest traffic routing, measured truck restrictions and automatic incident avoidance are unavailable with current access. This test does not validate local event coverage or actual ETA accuracy.

These blockers prevent declaring the complete booking/location experience pilot-ready, despite a successful trip lifecycle.

## Test records

- `PK-19F23FEC` / `c7b319d4-e4c3-4791-b3cb-3798e575fee4`: full completed/paid mock trip, two load photos, test feedback. Notes explicitly say NO LOAD / NO PAYMENT.
- `PK-690542F5` / `1e1c313b-5b7f-4162-ad3a-2eb2c1212dba`: simultaneous acceptance, release, rejection and timeout test. Notes explicitly mark mock testing.
- Accounts: MOCK WEB TEST Customer, MOCK WEB TEST Driver, MOCK WEB TEST Driver Two, MOCK WEB TEST Remote Customer.

## Still requires separate testing

Android hardware GPS/background tracking, notification accept/deny and overlay, camera capture, screen-off behavior, battery restrictions, real network loss/recovery, native map rendering, external navigation, speech microphone and Malayalam speech, scheduled dispatch, paid waiting after 30 minutes, admin map drawing, document approval and permissions/isolation security checks. Receipt control was visible; print output was not exercised.

## Evidence

- `artifacts/mock-web-transit.png`: customer transit screen with GPS freshness, real ETA, load-photo controls and map failure.
- `artifacts/mock-web-completed.png`: completed mock trip with cash collection record.
- `artifacts/mock-web-timeout.png`: no-driver timeout and retry control.
- `artifacts/mock-web-results.json`: final database assertions, trip audit actions, timeout duration and cleanup verification.

## Cleanup

All four test accounts were disabled through the guarded, audited admin account-edit RPC. Both test drivers are offline and have no active booking. Test bookings/photos/audit records remain clearly labelled for inspection. Temporary browser tabs were closed and the localhost:3001 GPS proxy was stopped. The real backend stays running on port 3000.

The mock collection remains part of the real database's ledger; exclude labelled mock trips from business totals. Preserve the audit trail rather than treating the test as real earnings.

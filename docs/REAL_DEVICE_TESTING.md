# Real-device acceptance checklist

Use actual consenting pilot accounts and an empty truck before carrying materials. Do not load test records into the production database from the automated fixtures.

## Set up
- Configure Supabase and Mappls (see MAPPLS_SETUP.md), run all three pilot migrations and Cron SQL. Bootstrap admin.
- Review/draw Thrissur boundary; set support phone and test skips. Verify a point outside the polygon is rejected.
- Book remotely from a customer phone outside the boundary: both sites inside the zone must work. An outside pickup or destination must be rejected. Leave the optional customer-device boundary restriction disabled for this pilot.
- Install both APKs, set LAN/HTTPS backend, and register two actual drivers with the same vehicle class. Both phones must be inside the active boundary and near pickup.
- Grant precise location. On Android 13+ grant notifications. Overlay permission is optional.

## Booking and dispatch
- Name/phone login works and restores after app restart. Admin requires a password.
- Manual quantity, site access, exact map-pin selection (search needs coordinate entitlement), vehicle recommendation and itemized quote match the final booking.
- Voice: say “one load of M-sand,” answer questions, correct to “two loads,” confirm exact addresses, and review the vehicle before booking. Repeat with Malayalam if Gemini/language packs are enabled.
- Both drivers see the request. Deny on one phone: it stays suppressed for that search.
- Repeat and accept simultaneously on both phones: only one succeeds; the loser popup disappears on refresh.
- Confirm the assigned driver's phone cannot accept a second job before collection.
- With no eligible drivers, observe 5 → 10 → 15 → 20 → 25 km and expiry after five minutes (worker cadence can delay status refresh by a few seconds; acceptance deadline is enforced server-side).
- Retry creates a fresh search attempt and may offer again to previously declining drivers.
- Scheduled booking stays pending until its selected start time.

## Tracking and completion
- Drive a short real route. Customer marker follows real coordinates; turn the driver screen off and navigate in Google Maps. Verify ongoing notification and GPS timestamps.
- Disable internet/GPS: customer shows stale sample, no synthetic movement. Restore connection: a fresh sample replaces it.
- Reach pickup: loading timer starts. Without skip, one photo cannot start the trip, two can. Camera and gallery work; documents accept PDF.
- Mark picked up: customer sees transit state and continues tracking. Reach destination: unloading timer starts.
- Complete work: final fare includes waiting beyond 30 minutes at each end. Driver stays reserved until collection.
- Confirm cash/UPI payment: release is automatic, receipt records method/reference, and another job can be offered.
- Customer can rate the trip. Refresh/restart the backend/app: records persist.

## Admin and boundaries
- Draw/activate another polygon; drivers outside active polygons are not eligible. Customer phone location does not restrict remote booking by default. Toggle service pause.
- Review private driver documents, approve/reject, create/edit/deactivate accounts. Cannot edit a driver with active work or disable your own admin account.
- Assign a matching free driver; wrong class/busy driver rejected. Release an accepted job and reassign. Operator cancellation requires a reason and is audited.
- Review trip ledger/CSV and recorded collection totals. These are collection records, not a gateway settlement report.
- Confirm a different customer cannot read a trip/photo and a driver cannot update someone else's trip. Completed-trip customer tracking must not reveal the driver's later location.

## Native conditions
- Test Android versions and battery settings on your actual pilot phones; notification visibility/overlay behavior varies.
- Verify accept/deny from the notification while the app is backgrounded.
- Revoke overlay/notification/microphone permissions and verify manual alternatives. Force-stop requires reopening.
- If Firebase is enabled, test both app IDs with the app closed and the worker running. Force-stop is not the same as closing the screen.
- Keep this pilot on a trusted local network until HTTPS hosting is ready. Browser GPS on a phone typically requires HTTPS; laptop localhost is suitable for web tests.

Record failures by trip code, phone model/Android version, stage, time and GPS timestamp. Resolve these before unsupervised trips.

## Mappls routing/ETA checks

- Confirm maps/search on localhost, the phone web origin, and both APKs; restricted WebView map keys must allow appassets.androidplatform.net.
- Record actual truck dimensions and gross/axle weight. Test skipped measurements show an unrestricted road estimate; full measurements request a trucking route. Provider refusal must stay visible. Standard mode uses only a generic profile and must show measured restrictions are not applied.
- On acceptance check current driver→pickup route/ETA. On pickup/loading hide moving ETA; on picked-up switch to driver→destination. Check updates approximately each minute and off-route refresh after a deviation.
- Turn GPS off and disconnect internet. Last GPS and route ages must increase; the app must label stale ETA and must not animate fabricated positions. Reconnect and confirm recovery.
- Driver reports remain pending until verified in admin roads. Verify a closure or flooding point on the road, check refresh and advisory display (avoidance is only available in predictive mode), dismiss it and check recovery. Confirm two-hour expiration. Never leave a test closure active after testing.
- Open external Mappls and Google Maps; verify navigation and PICKR screen-off GPS continue. External routing does not inherit truck constraints.
- Compare actual arrival against predicted arrival on several Thrissur routes at peak/off-peak times. Traffic API success alone does not establish local event coverage.

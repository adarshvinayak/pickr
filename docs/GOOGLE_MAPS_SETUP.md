# Google Maps setup

PICKR uses **Google Maps Platform** for everything map-related. (It replaced Mappls; see the superseded [MAPPLS_SETUP.md](MAPPLS_SETUP.md).)

| Job | Google API | Where |
|---|---|---|
| Map picker, live tracking, admin zone editor | Maps JavaScript API | browser/WebView, `src/components/pilot/MapView.tsx` |
| Place search ("Ollur station") | Places API (New) – Text Search | server, `src/lib/maps.ts` `geocodeAddress` |
| Address for a pinned point | Geocoding API | server, `reverseGeocode` |
| Quote distance, trip ETA, route line | Routes API – Compute Routes (traffic-aware) | server, `calculateRoute` |

## Keys (two, on purpose)
Create both in Google Cloud Console (billing must be on), then set them in `.env.local` and on Render.

1. **`GOOGLE_MAPS_SERVER_KEY`** (server only, never sent to a browser or app). Enable *Places API (New)*, *Geocoding API*, *Routes API*. Restrict "API restrictions" to just those three. Add an IP restriction only if your host has fixed outbound IPs (Render's are not fixed by default).
2. **`GOOGLE_MAPS_WEB_KEY`** (shipped to browsers through `/api/map/config`). Enable *Maps JavaScript API* only. Under "Website restrictions" allow:
   - your production origin (e.g. `https://pickr-xueh.onrender.com/*`)
   - local testing origins (`http://localhost:3000/*`)
   - the Android apps' WebView origin: `https://appassets.androidplatform.net/*`

Run `npm run pilot:setup` to check the three server APIs. The web key can only be checked in a browser: open `/customer`, start a booking, and confirm the map appears. A wrong referrer, a disabled API or billing off shows "Google Maps could not authorize this site" in place of the map.

## Behaviour changes from Mappls
- **No truck routing.** Google's routes are general driving routes. The truck height/width/weight/axle values drivers register are still stored and validated, but they no longer change the route, so a tall or heavy truck can be routed onto roads it cannot use. Drivers must check road signs and site access. (`restrictionsApplied` is always `false`; the trip screen says so.)
- **No automatic avoidance.** Admin-verified road reports (closures, flooding) are shown to drivers but do not reroute.
- **Scheduled bookings** now get a predictive ETA for the chosen departure time.
- **Address search** returns coordinates directly (no separate "Place Details" entitlement), so typed place search works without the old map-pin-only fallback.

## Costs
Each quote or ETA refresh is a billable Routes request, each search a Places request and each map load a Maps JavaScript load. Set quotas and budget alerts in Google Cloud before the pilot grows. The worker refreshes at most 4 active-trip routes per run and only for trips with fresh driver GPS.

## Testing
- Unit: `tests/maps.test.ts` (request shapes, error handling, polyline decoding).
- Manual: booking map pin + address text, a scheduled quote, a driver trip ETA, the admin zone editor, and the Android WebView.

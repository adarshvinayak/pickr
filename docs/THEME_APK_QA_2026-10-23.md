# PICKR construction theme and Android build — 23 October 2026

## Delivered

- Light theme with orange accents; dark theme with yellow accents. Account settings offer Light, Dark and Auto, with a quick switch on the customer home screen. Android system bars follow the selected theme.
- Construction dashboard hero, current GPS area/address, truck photo catalogue and real customer trip counts.
- Six initial material tiles in a three-column image grid, with search and More materials for the full 16-material catalogue. Selection remains single-choice.
- Representative manufacturer photographs for all eight vehicle categories, reused in truck selection, onboarding, trip history and tracking. Model details and sources: `src/assets/SOURCES.md`.
- Removed the road-width question from manual and voice booking. Existing explicitly recorded narrow-access data is preserved for compatibility and vehicle safety filtering.
- Pickup map starts at current GPS if no pickup has been selected. Existing selections are preserved. GPS/address lookups are shared briefly with the dashboard; denied GPS and unavailable reverse lookup have fallback messages.
- All new image assets are bundled locally and total approximately 470 KiB. No image hotlinks or extra runtime image libraries.
- Two sideloadable debug APKs, version 0.9.7-pilot / versionCode 16. Default backend remains `https://pickr-xueh.onrender.com`.

## Validation

- 88 unit tests across 16 suites passed, including four new GPS/address caching and failure-path tests.
- TypeScript, ESLint, Next production build and both Android flavour builds passed.
- APK signatures and client-bundle secret scan passed.
- Browser checks at 360 px: light/dark dashboard, truck details, image material choices, pickup, saved delivery, site details, truck selection, review, search and cancellation. Browser booking requests were isolated fixtures, not live dispatch.
- Android API 35 emulator: both APKs installed and launched. Customer permission prompt, current GPS display, single-choice material selection, real Mappls rendering and pickup confirmation/reopening checked.
- Emulator map checks exposed low-contrast location/attribution controls in dark mode; fixed before the final build.

## Scope and remaining setup

- Local UI fixtures live only in ignored `.local-tests/`; they are not shipped in the APKs or production app.
- GPS coordinates were simulated near Swaraj Round, Thrissur. UI tests do not establish real-road navigation accuracy or background reliability on physical phones.
- Mappls Web SDK returns HTTP 401 for `http://localhost:3003/` and `http://localhost:5176/`, but HTTP 200 for the Render and Android app-assets origins. Add localhost to the Mappls Web application allowlist for local browser maps. No key or allowlist was modified during this work.
- Truck images are representative manufacturer models. They are mostly front three-quarter views, but not identical angles. Confirm commercial reuse permission or replace with owned fleet photographs before public promotion. Hero and material images are generated illustrations.
- This is a theme/build verification pass, not a fresh end-to-end audit of live driver dispatch, push delivery, payments or administrative actions.
- Render has not been redeployed as part of this local build.

Screenshots and logs are in `.local-tests/theme-refresh/`. Only the latest two APKs and build manifest are retained in `artifacts/`.

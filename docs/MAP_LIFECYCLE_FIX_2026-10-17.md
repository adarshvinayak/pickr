# Mappls lifecycle repair — 17 October 2026

Reported symptoms: intermittent resource-unavailable notice and `this.handlers is undefined` / `destroy` SDK error.

The shared map component called `map.remove()` unconditionally during React cleanup, including when the SDK had not finished asynchronous setup. Cleanup exceptions were not contained. Every SDK resource error also became a persistent map failure, even after tiles recovered. The precise intermittent provider failure was not reproduced in the initial live-browser navigation check; these unsafe lifecycle paths were identified in source and covered with regression tests.

Changes:

- Defer teardown until load when leaving an initializing map; bound it with a cleanup fallback. Remove each instance at most once and contain provider teardown exceptions.
- Ignore interaction and resize callbacks for disposed/not-yet-initialized instances.
- Give each retry its own DOM map container, so late initialization cannot target the new retry container.
- Debounce resource notices, separate them from startup failures, clear transient warnings on a settled map, and retain the centre pin during a resource warning.
- Correct the map hint for centre-pin selection.

Validation: 79 unit tests in 13 suites, lint, TypeScript, production web build and both Android builds passed. Four new regression cases cover leaving before load, repeated cleanup SDK failure during bounded cleanup and cleanup retry after a late load. Android version is now 0.9.3-pilot / code 12. Artifacts contain only the two latest APKs and the build manifest. Local Mappls script access failed on the localhost origin, so real-provider visual verification uses the deployed allowed origin rather than claiming a successful local map test.

A genuine provider/network/key/traffic-layer failure can still interrupt map resources. This repair does not grant new Mappls entitlements or replace traffic data. Booking and route APIs remain separate from browser map tiles.

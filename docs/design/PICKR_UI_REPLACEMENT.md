# PICKR UI replacement — 11 October 2026

Source: `PICKR UI design/`, inspected as HTML plus screen PNGs. The bundle contains 32 HTML exports, including two release-modal variants, and one additional image-only folder. The implementation follows the actual exported interfaces: warm-white canvas, pale-green operational surfaces, rust actions, rounded white cards, Noto Sans / Noto Sans Malayalam, Material Symbols Outlined, horizontal booking progress, material radio cards/quantity stepper, contact panels, waiting timers, sticky job actions, and the admin queue/map workspace. Typography and icons remain bundled locally in web/Android rather than depending on Google Fonts or a Tailwind CDN at runtime.

## Imported design coverage

| Supplied screen | Working app surface |
|---|---|
| C01 sign-in | Compact branded pilot form and language control |
| C02 home | Greeting, operating area, primary manual booking, secondary voice entry, current-trip card, pricing policy |
| C03 material/quantity | Searchable catalogue radio cards, catalogue units/minimums, quantity stepper |
| C04/C05 site pickers | Search/GPS/saved sites, default-open live map, site name and pin confirmation |
| C07 truck selection | Compatible vehicle cards, real recommendation and fare, truck illustrations |
| C08 review | Sites/load/truck, edit actions, itemised fare, waiting policy, fixed confirmation |
| C10 driver search | Scheduled/search states, radius/time display and no-driver retry |
| C11 tracking | Map, actual route ETA/freshness, progress, driver contact and allowed cancellation |
| C12/C14 loading/unloading | Separate actual stage timers, allowance meter, contact/photos |
| C15/C16 completion/receipt | Pay-driver/collection panels, actual itemised total, manual payment state, print and review |
| C17 history | All/Active/Past filters, readable route/status/payment rows |
| D01 sign-in | Driver branding and pilot login |
| D02 truck specs | Actual catalogue/type/registration, illustration and real measurement fields |
| D04 documents | Private upload tiles and uploaded/manual-review states |
| D05 test-access screen | Explicit test-skip copy; actual approval/access/permission states |
| D06 jobs | Availability/GPS status, current job first, today's real work/collections |
| D07 alert | Fare/load/sites/instructions with both Take job and Decline in sticky footer |
| D08 pickup navigation | Actual site map/contact, external Mappls/Google navigation and arrival action |
| D10 load evidence | Photo upload/gallery and start-trip confirmation; test-only skip |
| D12 unloading | Independent timer, completion confirmation |
| D13 collection | Cash/direct UPI choice and explicit amount-received confirmation |
| D15 release variants | Reason plus accessible release/cancel confirmation; valid stages only |
| D16 collections ledger | Driver history with recorded-collection total; no fictitious wallet |
| A02 live operations | Persistent sidebar, real metrics, queue with map alongside; test rows excluded by default |
| A03 trip drawer | Modal detail drawer, actual stage actions, focus trapping and Escape/Android Back handling |
| A05 polygon editor | Controls/area list alongside map; draw/undo/clear/save; advanced JSON collapsible; saved-only deletion |
| A07 document review | Driver selector, actual specifications and four private document tiles; approval/suspension confirmations |
| A11 ledger | Full-width trip table, existing search, QA toggle and CSV export |

## Necessary adaptations

Exported sample names, fares, operating hours, fleets and timestamps are replaced by real data. No 24x7 support number, certifications, phone verification, confirmed road safety, mineral-pass verification, weighbridge integration, inspection signature, wallet balance or in-app payment gateway is introduced. Waiting remains 30 minutes per loading/unloading stage. Payment remains after completion. Existing deterministic rates, capacities, units and backend state transitions are unchanged.

Native APK version is 0.7.0-pilot / code 7, with HTTPS Render backend baked into the delivered builds. Both flavours share the React UI and existing native GPS, notifications, speech and printing bridges. The testing copy is visible only where pilot skips are enabled. Fonts remain local; no animation library, 3D dependency or new package was added.

## Screens not included in the supplied folder

Dedicated C06 site-details, C09 voice, C13 on-route, C18 account and C19 recovery exports; D03 measurements, D09 loading, D11 transit, D14 finished, D17 account and D18 road-issue exports; A01 login, A04 assignment, A09/A10 people/account forms, A12 settings, A13 road issues, A14 activity and A15 health exports. Existing working controls remain and now use the same new design system. No supplied profile screen was found. Dedicated empty/error/offline/Malayalam variants are also not separate supplied exports; functional states and translations are retained. The image-only file is treated as reference, not executable UI. Low-poly 3D models and real load photographs were not supplied, so no remote stock imagery or fake verification photos are introduced.

## Validation

- Lint and production web build pass; 62 existing tests in 10 suites pass.
- Both Android flavours build successfully; no new dependency added.
- Browser and Android visual/flow evidence is recorded in `artifacts/modern-*` and the follow-up validation record below. Local Mappls requests currently receive access-denied responses; real routing is checked from Render, without simulated provider responses.
- QA uses labelled test accounts and synthetic locations. These are never seeded as application defaults. Any test jobs are terminated and test accounts disabled after verification; existing pilot zones/settings are preserved.

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

## Validation record — redesigned build 0.7.0

This is a focused regression pass for the replacement UI. It does not imply that every earlier edge case in `QA_REPORT_2026-10-11.md` was repeated.

| Check | Result / evidence |
|---|---|
| Build and automated regressions | Production web build and lint pass; 62 tests in 10 suites pass |
| Android customer and driver flavours | Both build, install and launch; about 3.05 MiB per APK; HTTPS Render default |
| Customer sign-in, home, material selection | Checked in API 35 emulator; local fonts/icons, language control, catalogue and stepper render |
| Full native manual booking | Saved pickup/delivery → site details → real quote → truck selection → review → confirmation created a booking; final build opens search directly |
| Customer search cancellation | Reason entry and confirmation dialog persisted CANCELLED with a ₹0 recorded fee; other test search timed out as NO_DRIVERS |
| Driver delivery/completion/collection | Synthetic destination GPS matched server location; arrival opened a new 30-minute unloading timer; completion and Cash-confirmation dialogs persisted COMPLETED/paid and released the driver |
| Small-screen booking | Browser viewport 360×800, width/scrollWidth both 360; site details and fixed Continue action visible; back retains material quantity and sites |
| Saved pickup/delivery, quote failure | Both test sites selectable; local Mappls access-denied shows an actionable error rather than a fabricated fare |
| Real route quote | Labelled synthetic Thrissur booking created using a real Mappls quote from Render; no mocked provider response |
| No-driver recovery | Initial request expired before fresh emulator GPS; five-minute retry produced a request once driver GPS was fresh |
| Driver request alert and acceptance | Actual APK popup showed load, sites, fare, remaining time and both Take/Decline controls; Take accepted server job and reserved driver |
| Busy driver/customer | Availability controls disabled during job; new customer booking/voice controls disabled while active |
| Arrival/loading | Reached pickup action persisted; separate 30-minute loading countdown and actual overtime state rendered |
| Photo gate/start confirmation | Start disabled without photos/test skip; explicit recorded test skip used; confirmation required before departure |
| Android Back on confirmation | Retains trip and closes dialog in final build; reopening and confirming persists departure |
| Customer live tracking | Customer APK received IN_TRANSIT state, fresh driver GPS and real Mappls traffic ETA; synthetic midpoint sent through emulator GPS/native service |
| Admin live operations/ledger | Render navigation, real metrics, QA filter, tables, driver document review and active-job approval guard checked |
| Admin drawer keyboard | Detail opens with Close focused; Escape closes and restores focus to the trip row |
| Service areas | Existing Thrissur polygon/editor and inactive Bangalore area visible; no pilot boundaries/settings changed in this redesign pass |
| Pilot settings | Pause, remote-customer policy, test skips, radius and push health render their actual values; no values changed |

### Issues found and corrected

- Driver loading controls previously followed a long contact/navigation section. Stage timer, photo gate and payment panel now precede those supporting details; persistent primary actions stay available.
- Booking confirmation could show an empty trip area while a new snapshot was fetched. The authoritative booking response now supplies the immediate trip view; older in-flight snapshots cannot overwrite newer applied data, API requests bypass caches, and a missing-trip recovery panel replaces empty content. The final APK manual-booking check reached the search screen directly.
- Android Back could leave the trip while a confirmation was open in an earlier APK. The app-level handler now defers to an open modal; final APK check passed.
- Multi-point trip maps could frame an empty/ocean area because the running Mappls SDK swaps coordinate arrays with `cType:0`. The app stores GeoJSON order (`longitude, latitude`) and now requests `cType:1`. This was diagnosed from the live SDK implementation; map framing is verified visually in the rebuilt APK. Source reference: [Mappls SDK documentation](https://developer.mappls.com/documentation/sdk/mappls-web-maps/components/markers/).

### Practical limits and remaining work

- Local map REST access is still denied by Mappls allowlisting; Render quotes/ETA work. Local testing needs its current outbound IP allowed or the hosted backend.
- The current Mappls entitlement returns traffic ETA on a default route. Predictive/fastest truck routing and automatic incident avoidance are not established by this UI work.
- Firebase worker/push configuration remains a deployment task. Admin health reports an unsent push backlog. Foreground request popup/native online polling was checked; killed-app Firebase delivery and floating-window permission were not validated here.
- Camera/two-photo upload, voice recognition, real calls/navigation, native printing, and a physical-driver road run still need a device pass. This test used the explicitly enabled photo skip and synthetic GPS; no real load or funds were moved.
- Some long trip/support panels still require scrolling. Dedicated missing screens and Malayalam/offline variants listed above would make the next Stitch batch more complete. Existing functionality is retained within the new theme.

## Cleanup and evidence

Three labelled design-QA jobs ended as COMPLETED/paid, NO_DRIVERS, and CANCELLED. Only the two design-QA accounts were disabled (recoverable), their temporary admin session revoked, and the private test-token file removed. Existing pilot settings and Thrissur/Bangalore boundaries were preserved. The emulator is stopped after testing; no test data is added to application defaults. Screenshots in `artifacts/modern-*` show sign-in, home, materials, truck selection, search, actual road-map tracking, unloading, collection confirmation and admin operations. APK hashes/default backend are recorded in `artifacts/pickr-build-manifest.json`.

Heuristic UX assessment from this QA pass (not a participant study): visual consistency 8/10; wording/understanding 8/10; navigation 7/10; task completion 8/10. The strongest improvements are distinct booking steps, clear current-job actions and honest data/status labels. Next improvements: reduce scrolling in long review/support panels, keep estimated price visible beside the review confirmation, and verify keyboard/large-text/outdoor readability on actual driver phones.

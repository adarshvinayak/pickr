# PICKR interface replacement — 16 October 2026

The Claude artifact supplied by the user is the visual reference for this replacement:
https://claude.ai/artifact/XmQ5Nmy8w6BXKTRkxuir9c#page-dcb81aee8d83

All 63 artboards were exported after authenticated access: 52 numbered screen definitions, ten language/state/layout variants and the Main design-system artboard. Standalone HTML is in `exports/claude-pickr-batch-1-2026-10-16/clean/`; `inventory.json` retains each original label and filename. `exports/pickr-claude-design-reference-2026-10-16.zip` is the portable reference package. These files are design references; they are never loaded as application data.

## Visual system applied

- Noto Sans and Noto Sans Malayalam, served locally; Material Symbols Rounded with outline/fill states, locally subset to about 36 KB.
- Canvas `#FAFAF7`, white cards, ink `#18221F`, muted text `#68736E`, borders `#DCDFD8`, rust action `#B44718`, green `#15805D`, amber and error tints from the reference.
- Reference typography, rounded cards, segmented progress, primary/secondary buttons, bottom sheets, status chips, map sheets, permission rows and spacing. Mobile content adapts to the available phone height; fixed controls leave scrollable space for real data and Malayalam text.
- Shared customer/driver navigation, separate booking stages, driver loading/photo stages and account subpages. Admin uses the reference desktop sidebar and mobile menu, full trip detail, tables, review/edit screens and assignment modal. The mobile operations queue uses cards with a live-map toggle; the ledger supports date and payment filters.
- Real Mappls maps, attribution, routing and GPS remain connected. Provider tiles and controls are not replaced with the reference's illustrative maps.

## Screen implementation map

| Reference | Implemented surface |
|---|---|
| C01 / invalid phone / Malayalam | `design/SignIn.tsx`: phone prefix, inline validation, pilot notice, language pills |
| C02 / 360px active / Malayalam active / paused | `CustomerHome.tsx`: hero, speak action, policies, active booking, live/stale location, paused state |
| C03 | `BookingForm.tsx`: searchable live catalogue and quantity stepper |
| C04, C05 | `LocationPicker.tsx`: live map, search, GPS, saved sites, exact pin, boundary validation |
| C06 | `BookingForm.tsx`: access, notes, permit, labour when relevant, now/schedule |
| C07 | `BookingForm.tsx`: eligible actual trucks, recommendation, fare and distinct truck illustrations |
| C08 / Malayalam | `BookingForm.tsx`: editable review, real prices, waiting policy, detailed breakdown |
| C09 | `VoiceIntake.tsx`: one question, microphone, chips, typed fallback, explicit pin confirmation |
| C10 | `TripView.tsx`: expanding real search radius, remaining time, cancellation; scheduled/no-driver/retry states also supported |
| C11, C13 | `TripView.tsx`: map and tracking sheet, current or stale ETA, driver contact and progress |
| C12, C14 | `TripView.tsx`: separate loading/unloading timers, contact, site details and evidence |
| C15 | `TripView.tsx` / `design/TripFare.tsx`: pay-driver instructions, live payment confirmation state |
| C16 | `TripView.tsx`: receipt, print/save, real fare, star rating and feedback |
| C17 | `TripHistory.tsx`: all/scheduled/past, active grouping, paid/fee/no-charge labels |
| C18 | `AccountScreen.tsx`: profile, language sheet, saved sites/add-site, payment help, support |
| C19 | `design/OfflineScreen.tsx`: retry, last known information when available, phone contact; no invented persistent trip cache |
| D01 | `design/SignIn.tsx`: driver-specific sign-in |
| D02 | `Onboarding.tsx`: actual truck catalogue and vehicle number |
| D03 | `Onboarding.tsx`: truck illustration and all five actual routing measurements |
| D04 | `Onboarding.tsx`: private document upload, camera/file, real upload state and test skip |
| D05 | `design/DriverApproval.tsx`: pending/rejected approval, actual permissions and setup actions |
| D06 / offline / Malayalam available / unpaid-reserved | `DriverDashboard.tsx`: availability, GPS freshness, real daily totals and reserved job |
| D07 / Malayalam | `DriverOffer.tsx`: incoming request, actual search expiry, load/sites/fare, accept/decline |
| D08, D11 | `TripView.tsx`: driver map, destination, navigation/call controls, reach-site action |
| D09, D12 | `TripView.tsx`: loading/unloading elapsed time, allowance, contact, next-stage action |
| D10 | `TripView.tsx`: separate photo screen, two-photo gate and start confirmation |
| D13 | `TripView.tsx`: collection method, amount, confirmation; reserved until received |
| D14 | `TripView.tsx`: finished state, actual availability, receipt and back-to-jobs |
| D15 | `TripView.tsx`: release-reason sheet and explicit confirmation at allowed stages |
| D16 | `TripHistory.tsx`: trip history and recorded collections, not a wallet |
| D17 | `AccountScreen.tsx`: truck, documents, language, actual GPS/notification/overlay settings |
| D18 | `RoadReports.tsx`: issue type, actual GPS or map pin, notes and review status |
| A01 | `design/SignIn.tsx`: centred admin sign-in |
| A02 desktop/mobile | `admin/TripOperations.tsx`: metrics, filters, QA visibility, real map, desktop queue/mobile cards |
| A03 | `admin/TripDetail.tsx`: full detail page, actual timeline, contacts, private photos, fare, operator controls |
| A04 | `admin/TripOperations.tsx`: assignment modal with eligible available trucks only |
| A05, A06 | `admin/ServiceAreas.tsx`: list, paused/active polygons, map editor, undo/clear, validated coordinates, save/delete |
| A07, A08 | `admin/Drivers.tsx`: searchable/filterable list, measurements, private document review, approval controls |
| A09, A10 | `admin/People.tsx`: list/filter/search, separate create/edit form, account deactivation |
| A11 | `admin/TripOperations.tsx`: ledger, search/stage/payment/date/QA filters and filtered CSV export |
| A12 | `admin/SettingsHealth.tsx`: dispatch/support/test controls, unsaved-change bar, save/discard |
| A13 | `RoadReports.tsx`: issue list, status filtering, verify/dismiss and new operator report |
| A14 | `AdminConsole.tsx`: actual activity records with expandable details |
| A15 | `admin/SettingsHealth.tsx`: actual database/migration checks, key configuration and pending-push count |

## Necessary differences from the static prototypes

| Design example | Live implementation |
|---|---|
| Four example truck types and illustrative capacities | Existing eight-truck catalogue and deterministic eligibility retained. Rates/capacities were not changed. |
| Example fares, ₹300 cancellation and ₹10/min waiting | Actual pricing configuration and current trip values. Waiting-policy display now uses the same helper as calculation, including the 17ft truck. |
| Customer cancellation during loading | Customer cancellation stops before pickup arrival. Driver release is allowed before starting; operator emergency cancellation remains available under existing server rules. |
| Fake map/traffic marks and sample moving truck | Actual Mappls map and observed driver samples. Stale data is explicitly labelled. |
| Example pickup proximity/offer countdown | Actual trip distance and actual five-minute search expiry; no invented driver-to-pickup ETA. |
| Fixed 8 MB document error and 64% progress | Actual 10 MB document limit; real uploading/uploaded/error states. No fabricated progress percentage. |
| “Approved within a day” or prefilled permissions | Actual approval and OS permission states. No promised review SLA. |
| Offline “kept on this phone” claims | Saved sign-in and booking draft are retained; last fetched trip stays in memory while the page is open. Cold offline launch does not claim a cached trip/contact that has not been persisted. |
| Prototype requires both sites in the same polygon | Existing backend requires each site inside an active polygon; different active areas can currently be used. No dispatch/coverage rule was silently changed in this visual replacement. |
| Last changed / historic boundary trip metrics without backing data | Omitted unavailable values rather than inventing history. Current polygons and active state are real. |
| Driver switching inside an accepted trip | Release/restart search is confirmed first; only eligible available trucks can then be assigned. |
| Prototype admin delete | Accounts are disabled and audit references retained. Boundary deletion remains a confirmed operation. |

This is a working implementation based on the complete reference set, not a claim of automated pixel equivalence across every device and state. Dynamic content, provider map rendering, catalogue rules and OS chrome necessarily differ. The accompanying QA report separates observed results from remaining field verification.

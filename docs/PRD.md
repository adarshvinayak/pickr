# PRD.md — PICKR MVP

**Goal:** a working, demoable, end-to-end booking product for construction-materials freight in Kochi, Kerala — customer app plus a driver test harness — with no authentication and mocked payment.

**Explicit non-goal:** revenue, scale, or production hardening. This MVP exists to validate the flow and to demo to drivers and contractors.

---

## 1. In scope

| # | Capability |
|---|---|
| 1 | Voice booking with one-question-at-a-time slot filling and tappable chip answers |
| 2 | Manual booking through a stepped form |
| 3 | Repeat-booking tiles from history and named saved sites |
| 4 | Deterministic vehicle selection from material + quantity + site access |
| 5 | Itemised freight quote with distance, labour, surge, platform fee and GST |
| 6 | Booking creation, driver broadcast with a widening radius, first-wins acceptance |
| 7 | Mock one-click payment, with cash on delivery as the default |
| 8 | Live tracking — map with simulated lorry marker, six-step Trip Ladder, ETA |
| 9 | Masked-call button (opens `tel:` in MVP), cancel, reschedule |
| 10 | Proof of delivery — photo upload and 4-digit OTP at drop |
| 11 | Trip history and receipt |
| 12 | Driver harness at `/driver` — driver selector, availability switch, job cards, accept/decline, status advance, cancel |
| 13 | Optional transit-pass capture for minor minerals |

## 2. Out of scope for MVP

Authentication · real payments · SMS/push notifications · multi-drop · return loads · multi-load parent orders · Malayalam UI · driver earnings/wallet · ratings that affect matching · admin panel · e-way bill · native apps.

---

## 3. Primary user stories

**Customer**
1. As a site supervisor, I tap the mic, say *"one load of M-sand"*, answer two questions, and see a confirmed booking — so that I don't have to call four lorry owners.
2. As a contractor, I see exactly what I'm being charged and why, before I confirm — so that I stop being overcharged.
3. As a customer, I watch the lorry move on a map and know when it will arrive — so that I can have labour ready.
4. As a customer, I book the same debris run again in two taps — because I do it four times a week.
5. As a customer whose driver cancelled, I'm told immediately and a new search starts automatically.

**Driver**
6. As a driver, I see the job's route, load, time and **what I'll earn**, and I decide whether to take it — with no penalty for declining.
7. As a driver, I advance the trip through six clear steps with one big button.
8. As a driver, I switch myself off when I'm working for a regular client.

---

## 4. Acceptance criteria — the demo script

The MVP is done when this runs end to end without intervention, in two browser windows side by side.

1. Open `/`. Home shows saved sites and (after the first booking) repeat tiles.
2. Tap the mic. Say *"I need one load of M-sand."*
3. The sheet shows `✓ M-Sand ✓ 1 unit ✓ Tipper Lorry` and asks **only** *"Where should the sand be picked up from?"* with chips.
4. Answer pickup, then drop, then time — one question per turn, each with chips.
5. Read-back appears with vehicle, distance and total. Confirm.
6. Review screen shows the itemised breakdown; labour toggle is off (M-Sand tips); payment defaults to cash on delivery. Confirm booking.
7. Status becomes `SEARCHING`. The searching screen shows the radius widening.
8. In the second window, `/driver`, select a `tipper_100` driver. The job card appears **within 2 seconds**, showing route, load, time and earning.
9. Tap `Accept`. The customer window updates **within 2 seconds** to `Lorry confirmed` with the driver's name, vehicle number and a call button.
10. Payment step appears on the customer side (mock, one click). Or COD is already selected and no payment is needed.
11. Driver advances: `Reached pickup` → `Load picked up` → `In transit` → `Reached drop` → `Unload successful`. The customer's Trip Ladder advances each time, and the marker animates along the route.
12. At drop, the driver uploads a photo and enters the 4-digit OTP shown on the customer's screen.
13. Customer sees the receipt. The trip appears in history with a `Book again` action.
14. Repeat the flow, and at step 8 tap `Decline` on driver A — the job stays live and reaches driver B.
15. Repeat again, cancel from the customer side before pickup — the driver's active trip clears.
16. Repeat once more, cancel from the driver side after acceptance — the customer sees *"Your driver cancelled. Finding another lorry."* and a new broadcast begins.

Every one of steps 8, 9, 11 and 16 must propagate via Supabase Realtime, not polling.

---

## 5. Success measures for the pilot (post-build)

| Metric | Target |
|---|---|
| Acceptance within 5 minutes | > 80% |
| Voice bookings completed without falling back to manual | > 50% |
| Quoted vs final fare variance | < 5% |
| Driver no-show after acceptance | < 10% |
| Repeat booking rate within 30 days | > 40% |

---

## 6. Risks carried into v1

| Risk | Mitigation |
|---|---|
| Voice accuracy on noisy sites | Chips mirror every question; auto-fallback to manual after two failures |
| Zero driver liquidity at launch | Manual WhatsApp dispatch for the first 200 trips before public launch |
| Mineral transit pass enforcement | Capture pass number, surface on driver card, add advisory notice |
| Thin unit economics | Launch in one taluk; prioritise debris and urgent runs where freight is the whole ticket |
| Drivers perceiving loss of control | No decline penalties, master availability switch, zone preferences, "fill your empty hours" positioning |

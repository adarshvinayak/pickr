# BUSINESS_RULES.md — PICKR
**Single source of truth for catalogue, pricing, matching, statuses and conversation logic.**
The agent must implement these rules exactly. Do not invent values. Every number here lives in `src/config/` as typed constants so it can be tuned without touching logic.

---

## 1. Vehicle catalogue

Kerala market vehicles. `id` is the DB key. `localNames` are shown as secondary text so users recognise the vehicle.

| id | Display name | Local names | Capacity (kg) | Volume | Body | Icon key |
|---|---|---|---|---|---|---|
| `pickup_auto` | Pickup Auto | Ape, Three-wheeler | 500 | — | Open | `auto` |
| `tata_ace` | Tata Ace | Chottu, Mini lorry | 750 | — | Open/Closed | `ace` |
| `pickup_1t` | Bolero Pickup | Pickup, 1-ton | 1,500 | — | Open | `pickup` |
| `lcv_14ft` | 14ft Lorry | 407, Eicher | 2,500 | — | Open/Closed | `lcv` |
| `container_17ft` | 17ft Closed Body | Container lorry | 3,500 | — | Closed | `container` |
| `tipper_100` | Tipper Lorry (1 unit) | Tipper, 6-wheel | 4,500 | 100 CFT | Tipper | `tipper_small` |
| `tipper_200` | Medium Tipper (2 unit) | 10-wheel tipper | 9,000 | 200 CFT | Tipper | `tipper_medium` |
| `taurus_700` | Leyland Taurus (7 unit) | Taurus, multi-axle | 25,000 | 700 CFT | Tipper | `tipper_large` |

**Out of scope for MVP:** JCB, excavator, crane, forklift, concrete mixer, water tanker.

---

## 2. Material catalogue

Users select and speak in **trade units**. Kilograms are an internal concept only and must never appear as a user-facing input field.

| id | Display name | Native unit | kg per unit | Min qty | Default vehicle | Moisture sensitive | Tips (no labour) | Icon key |
|---|---|---|---|---|---|---|---|---|
| `m_sand` | M-Sand | unit (100 CFT) | 4500 | 1 | `tipper_100` | No | Yes | `sand` |
| `p_sand` | P-Sand | unit (100 CFT) | 4500 | 1 | `tipper_100` | No | Yes | `sand` |
| `river_sand` | River Sand | unit (100 CFT) | 4300 | 1 | `tipper_100` | No | Yes | `sand` |
| `jelly_20` | 20mm Jelly | unit (100 CFT) | 4800 | 1 | `tipper_100` | No | Yes | `aggregate` |
| `jelly_40` | 40mm Jelly | unit (100 CFT) | 4800 | 1 | `tipper_100` | No | Yes | `aggregate` |
| `jelly_10` | 10mm Jelly | unit (100 CFT) | 4800 | 1 | `tipper_100` | No | Yes | `aggregate` |
| `mud` | Mud / Soil | load | 4500 | 1 | `tipper_100` | No | Yes | `soil` |
| `debris` | Debris / Waste | load | 4000 | 1 | `tipper_100` | No | Yes | `debris` |
| `cement` | Cement | bag (50 kg) | 50 | 10 | see §4 | **Yes** | No | `cement` |
| `steel` | TMT Steel | kg | 1 | 100 | see §4 | Yes | No | `steel` |
| `bricks` | Bricks | nos | 3 | 100 | see §4 | No | No | `brick` |
| `hollow_blocks` | Hollow Blocks | nos | 18 | 50 | see §4 | No | No | `block` |
| `tiles` | Tiles | box | 25 | 5 | see §4 | Yes | No | `tiles` |
| `pipes` | Pipes | bundle | 30 | 1 | see §4 | No | No | `pipes` |
| `wood` | Wood / Shuttering | load | 1500 | 1 | `lcv_14ft` | Yes | No | `wood` |
| `mixed` | Mixed / Other | load | 1000 | 1 | `pickup_1t` | Ask | No | `mixed` |

**Unit vocabulary the parser must accept as synonyms:**
- `unit` ≡ `load` ≡ `lorry load` ≡ `100 CFT` ≡ `brass` (for sand/jelly)
- `jelly` ≡ `aggregate` ≡ `metal` ≡ `kambi kallu`
- `bag` ≡ `chaakku` (cement)
- `debris` ≡ `waste` ≡ `malinyam` ≡ `construction waste`
- `mud` ≡ `soil` ≡ `earth` ≡ `mann`

---

## 3. Vehicle selection algorithm

**This is deterministic code, not an LLM decision.** The LLM parses language; this function decides the truck.

```
selectVehicle(materialId, quantity, siteAccess):
  1. totalKg = quantity × material.kgPerUnit
  2. candidates = vehicles where capacityKg >= totalKg
  3. if material.tips == true:
        candidates = candidates filtered to body == 'Tipper'
     if material.moistureSensitive == true AND totalKg <= 3500:
        prefer body == 'Closed'
  4. if siteAccess == 'narrow':
        candidates = candidates where capacityKg <= 2500
        if totalKg > 2500: return SPLIT_REQUIRED (suggest N trips)
  5. return smallest candidate by capacityKg
  6. if no candidate fits (totalKg > 25000):
        return MULTI_TRIP with tripCount = ceil(totalKg / 25000)
```

**Worked examples the agent must verify against:**
- `1 unit M-Sand` → 4,500 kg → tipper only → `tipper_100` ✓
- `2 unit M-Sand` → 9,000 kg → `tipper_200` ✓
- `30 bags cement` → 1,500 kg → moisture sensitive → `lcv_14ft` (closed) ✓
- `10 bags cement` → 500 kg → `tata_ace` (closed) ✓
- `1 load debris, narrow lane` → 4,000 kg but capped at 2,500 → SPLIT_REQUIRED, 2 trips ✓
- `500 kg TMT steel` → `tata_ace` ✓

Always show the user the chosen vehicle **with an explanation line**: *"Tipper Lorry — right size for 1 unit of M-Sand."* Allow manual override to any larger vehicle (never smaller).

---

## 4. Pricing engine

Freight-only. **Never quotes material cost.** All values in `src/config/pricing.ts`.

### 4.1 Formula

```
subtotal      = baseFare
              + (max(0, billableKm - includedKm) × perKmRate)
              + labourCharge          (if labourNeeded)
              + waitingCharge         (post-trip only)
subtotal      = subtotal × surgeMultiplier
platformFee   = round(subtotal × 0.08)
gst           = round((subtotal + platformFee) × 0.05)
total         = subtotal + platformFee + gst
minimumFare   = vehicle.minimumFare       // total is never below this
```

`billableKm` = Mappls road routing distance, pickup → drop, rounded up to 1 decimal.

### 4.2 Rate card (indicative, South India / Kerala 2026 — tune with real data)

| Vehicle | Base fare | Included km | Per km after | Minimum fare | Labour charge |
|---|---|---|---|---|---|
| `pickup_auto` | ₹180 | 3 | ₹18 | ₹200 | ₹150 |
| `tata_ace` | ₹250 | 3 | ₹22 | ₹280 | ₹250 |
| `pickup_1t` | ₹350 | 3 | ₹26 | ₹400 | ₹350 |
| `lcv_14ft` | ₹550 | 4 | ₹32 | ₹600 | ₹500 |
| `container_17ft` | ₹700 | 4 | ₹36 | ₹750 | ₹600 |
| `tipper_100` | ₹1,400 | 10 | ₹55 | ₹1,500 | ₹700 |
| `tipper_200` | ₹2,200 | 10 | ₹75 | ₹2,400 | ₹1,000 |
| `taurus_700` | ₹4,500 | 10 | ₹110 | ₹4,800 | ₹1,800 |

*Sanity check against real Kerala data: a 1-unit M-Sand load delivered within 10 km costs ₹6,800 all-in (LorryRally, 2026). Material at ~₹4,800/unit implies ~₹2,000 freight. Our `tipper_100` at 10 km = ₹1,400 base + ₹0 distance + 8% + 5% GST ≈ ₹1,588. Within range and deliberately slightly under market — correct positioning for a new entrant.*

### 4.3 Surge multipliers

| Condition | Multiplier |
|---|---|
| Night (22:00–05:59) | 1.20 |
| Morning peak (08:00–10:59) | 1.10 |
| Evening peak (17:00–19:59) | 1.10 |
| Standard | 1.00 |
| Express (< 60 min pickup) | +0.15 additive |

Only one time-of-day multiplier applies. Express stacks additively.

### 4.4 Waiting charges
- 30 minutes free at pickup, 30 minutes free at drop.
- Beyond that: ₹4/min for small vehicles (≤2,500 kg), ₹8/min for tippers.
- Computed from status timestamps after completion. **Shown to the user upfront as a policy line, never as a surprise.**

### 4.5 Display rules
- Always show the itemised breakdown before confirmation. Every line labelled in plain words: *Base fare*, *Distance (12.4 km)*, *Loading & unloading*, *Night charge*, *Platform fee*, *GST*.
- Round the displayed total to the nearest ₹10.
- Show `₹` prefix, Indian digit grouping (`₹1,58,000`).

---

## 5. Booking status machine

```
DRAFT
  └→ SEARCHING          (broadcast live)
       ├→ ACCEPTED      (driver assigned)
       └→ NO_DRIVERS    (all pools exhausted — terminal)
ACCEPTED
  └→ AT_PICKUP          "Reached pickup location"
       └→ LOADED        "Load picked up"
            └→ IN_TRANSIT
                 └→ AT_DROP    "Reached drop location"
                      └→ COMPLETED  "Unload successful"
Any of [SEARCHING, ACCEPTED, AT_PICKUP] → CANCELLED
```

**User-facing status labels (use these exact strings):**
| Status | User sees | Driver sees |
|---|---|---|
| `SEARCHING` | Finding a lorry for you | — |
| `ACCEPTED` | Lorry confirmed | Go to pickup |
| `AT_PICKUP` | Driver at pickup point | Confirm loading |
| `LOADED` | Load picked up | Start trip |
| `IN_TRANSIT` | On the way to your site | Reached drop point |
| `AT_DROP` | Driver reached your site | Confirm unload |
| `COMPLETED` | Delivered | Trip complete |
| `CANCELLED` | Trip cancelled | Trip cancelled |
| `NO_DRIVERS` | No lorry available right now | — |

Status is strictly forward-only except cancellation. The API must reject out-of-order transitions.

### 5.1 Broadcast ladder
```
t=0s     broadcast to drivers within 5 km of pickup, matching vehicle class & available
t=45s    if unaccepted → widen to 10 km
t=90s    if unaccepted → widen to 20 km
t=180s   if unaccepted → status = NO_DRIVERS, notify user, offer retry or schedule
```
First driver to accept wins. Losing drivers see the card disappear with *"Taken by another driver."*

### 5.2 Cancellation rules

| Actor | Allowed until | Charge |
|---|---|---|
| User | before `AT_PICKUP` | Free before `ACCEPTED`; ₹100 or 10% (whichever lower) after `ACCEPTED` |
| Driver | before `LOADED` | No charge in MVP (no penalties in v1 — see strategy doc §4.6) |

Driver cancellation after `ACCEPTED` triggers **immediate re-broadcast from t=0** and notifies the user: *"Your driver cancelled. Finding another lorry."*

### 5.3 Reschedule rules
- **User only.** Not available to drivers.
- Allowed while status is `SEARCHING` or `ACCEPTED`. **Blocked from `AT_PICKUP` onward.**
- Rescheduling from `ACCEPTED` releases the current driver and re-enters `SEARCHING` at the new time.
- Cancellation charge does not apply to a reschedule.

---

## 6. Voice / conversational order intake

### 6.1 Required slots
| Slot | Required | Inferable? |
|---|---|---|
| `material` | Yes | No |
| `quantity` + `unit` | Yes | Default to material's min qty if user says "a load" |
| `pickupLocation` | Yes | From saved sites / last used |
| `dropLocation` | Yes | From saved sites |
| `when` | Yes | Default `now` |
| `labourNeeded` | Only if material doesn't tip | Auto `false` for tipping materials |
| `siteAccess` | Only if vehicle > 2,500 kg | Default `normal`, remembered per saved site |
| `vehicleType` | No | Always derived by §3 |

### 6.2 Conversation contract

**Rules the agent must implement:**
1. **Ask for exactly one missing slot per turn.** Never a multi-part question.
2. **Every question renders as both speech and tappable chips.** If the app asks *"How much sand?"*, the screen shows `[1 unit] [2 units] [3 units] [Other]`. This is mandatory — see strategy doc §4.1.
3. **Never re-ask a filled slot.** Show filled slots as a live summary strip above the mic.
4. **Infer aggressively.** "One load of M-sand" fills material, quantity, unit, vehicle, labour (false) — leaving only pickup and drop.
5. **Accept corrections at any point.** "No, make it 2 loads" updates quantity and re-derives the vehicle.
6. **Confirm before searching.** Read back the full order, then a single `Confirm` button.
7. **Timeout to manual.** After 2 failed recognitions on the same slot, switch that slot to the manual picker automatically, without comment.
8. **Never ask for weight in kg.** Ask in the material's native unit only.

### 6.3 Example conversation (implement this exactly as an E2E test case)

```
User:  "I need one load of M-sand"
App:   ✓ M-Sand · 1 unit · Tipper Lorry
       "Where should the sand be picked up from?"
       [Perumbavoor Quarry] [Aluva Depot] [Choose on map]
User:  "From Perumbavoor quarry"
App:   ✓ Pickup: Perumbavoor Quarry
       "And where should it be delivered?"
       [Kakkanad Site] [Aluva Site] [Choose on map]
User:  "Kakkanad site"
App:   ✓ Drop: Kakkanad Site
       "When do you need it?"
       [Now] [In 2 hours] [Pick a time]
User:  "Now"
App:   "One load of M-Sand from Perumbavoor Quarry to Kakkanad Site, now.
        Tipper Lorry, 18.2 km, ₹1,860 total."
       [Confirm booking] [Change something]
```

### 6.4 Parser output contract

The LLM must return **only** this JSON — no prose, no markdown fences:

```json
{
  "material": "m_sand | null",
  "quantity": 1,
  "unit": "unit | bag | nos | kg | box | bundle | load | null",
  "pickupText": "Perumbavoor quarry | null",
  "dropText": "Kakkanad site | null",
  "when": "now | ISO8601 | null",
  "labourNeeded": true | false | null,
  "siteAccess": "normal | narrow | null",
  "confidence": 0.0,
  "nextQuestion": {
    "slot": "pickupLocation",
    "text": "Where should the sand be picked up from?",
    "chips": ["Perumbavoor Quarry", "Aluva Depot", "Choose on map"]
  } | null,
  "readyToConfirm": false
}
```

If `confidence < 0.5` on any slot, treat it as null and ask.

---

## 7. Compliance flags (capture, do not enforce, in MVP)

- **Mineral transit pass:** when material ∈ {m_sand, p_sand, river_sand, jelly_*, mud}, show an optional field *"Transit pass number (if you have one)"* on the booking screen and surface it on the driver's trip card. Add a one-line notice: *"Minor minerals need a valid transit pass in Kerala."*
- **GST invoice details:** optional GSTIN field, stored, unused in MVP.
- **E-way bill:** out of scope; note in schema only.

---

## 8. Non-negotiables checklist for the agent

- [ ] Payment happens **after** driver acceptance, never before.
- [ ] Cash on delivery is the **default** payment method.
- [ ] Kilograms never appear as a user input.
- [ ] There is no minimum booking lead time; `Now` is always available.
- [ ] Every voice question has tappable chips.
- [ ] Vehicle selection is code, not LLM.
- [ ] Price breakdown is always itemised before confirmation.
- [ ] Both parties get a call button from `ACCEPTED` onward.
- [ ] Status transitions are forward-only and server-validated.

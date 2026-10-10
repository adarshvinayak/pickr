# DATA_MODEL.md — PICKR

Postgres via Supabase. **No auth tables in MVP** — users are identified by a `session_id` (UUID in `localStorage`) plus a phone number captured at booking. RLS disabled for MVP; noted as a v2 task.

---

## 1. Schema

```sql
-- ─────────────────────────────────────────────
-- Reference data (seeded, read-only at runtime)
-- ─────────────────────────────────────────────

create table vehicle_types (
  id                text primary key,          -- 'tipper_100'
  display_name      text not null,
  local_names       text[] not null default '{}',
  capacity_kg       integer not null,
  volume_cft        integer,
  body_type         text not null,             -- 'open' | 'closed' | 'tipper'
  icon_key          text not null,
  base_fare         integer not null,          -- paise-free rupees
  included_km       numeric(4,1) not null,
  per_km_rate       integer not null,
  minimum_fare      integer not null,
  labour_charge     integer not null,
  waiting_rate_min  integer not null,
  sort_order        integer not null
);

create table materials (
  id                  text primary key,        -- 'm_sand'
  display_name        text not null,
  synonyms            text[] not null default '{}',
  native_unit         text not null,           -- 'unit' | 'bag' | 'nos' | 'kg' | 'box' | 'bundle' | 'load'
  kg_per_unit         numeric(10,2) not null,
  min_quantity        numeric(10,2) not null default 1,
  default_vehicle_id  text references vehicle_types(id),
  moisture_sensitive  boolean not null default false,
  self_tipping        boolean not null default false,
  needs_transit_pass  boolean not null default false,
  icon_key            text not null,
  sort_order          integer not null
);

-- ─────────────────────────────────────────────
-- Actors
-- ─────────────────────────────────────────────

create table drivers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text not null,
  vehicle_type_id text not null references vehicle_types(id),
  vehicle_number  text not null,               -- 'KL 07 AB 1234'
  rating          numeric(2,1) default 4.5,
  is_available    boolean not null default true,
  home_lat        double precision not null,
  home_lng        double precision not null,
  current_lat     double precision,
  current_lng     double precision,
  preferred_zones text[] default '{}',
  created_at      timestamptz default now()
);

create table saved_sites (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,
  label       text not null,                   -- 'Kakkanad Site'
  address     text not null,
  lat         double precision not null,
  lng         double precision not null,
  site_access text not null default 'normal',  -- 'normal' | 'narrow'
  last_used   timestamptz default now(),
  created_at  timestamptz default now()
);
create index on saved_sites (session_id, last_used desc);

-- ─────────────────────────────────────────────
-- Bookings
-- ─────────────────────────────────────────────

create table bookings (
  id                  uuid primary key default gen_random_uuid(),
  short_code          text not null unique,     -- 'LR-4821', shown to users & drivers
  session_id          text not null,
  customer_phone      text,
  customer_name       text,

  -- what
  material_id         text not null references materials(id),
  quantity            numeric(10,2) not null,
  unit                text not null,
  total_weight_kg     numeric(10,2) not null,
  vehicle_type_id     text not null references vehicle_types(id),
  labour_needed       boolean not null default false,
  site_access         text not null default 'normal',
  notes               text,
  transit_pass_no     text,
  gstin               text,

  -- where
  pickup_label        text not null,
  pickup_address      text not null,
  pickup_lat          double precision not null,
  pickup_lng          double precision not null,
  drop_label          text not null,
  drop_address        text not null,
  drop_lat            double precision not null,
  drop_lng            double precision not null,
  distance_km         numeric(6,2) not null,
  route_polyline      text,                     -- encoded polyline from Mapbox
  duration_min        integer not null,

  -- when
  scheduled_for       timestamptz not null,
  is_express          boolean not null default false,

  -- money (all integer rupees)
  base_fare           integer not null,
  distance_fare       integer not null,
  labour_fare         integer not null default 0,
  surge_multiplier    numeric(3,2) not null default 1.00,
  surge_reason        text,
  waiting_fare        integer not null default 0,
  platform_fee        integer not null,
  gst                 integer not null,
  total_fare          integer not null,
  payment_method      text not null default 'cod',   -- 'cod' | 'online'
  payment_status      text not null default 'pending', -- 'pending' | 'paid' | 'refunded'

  -- state
  status              text not null default 'DRAFT',
  driver_id           uuid references drivers(id),
  broadcast_radius_km integer not null default 5,
  cancelled_by        text,                     -- 'user' | 'driver' | 'system'
  cancellation_fee    integer default 0,
  pod_photo_url       text,
  pod_otp             text,
  driver_rating       integer,

  -- input provenance (useful analytics)
  input_mode          text not null default 'manual', -- 'voice' | 'manual' | 'repeat'
  raw_transcript      text,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index on bookings (session_id, created_at desc);
create index on bookings (status);
create index on bookings (driver_id, status);

create table booking_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  status      text not null,
  actor       text not null,          -- 'user' | 'driver' | 'system'
  note        text,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz default now()
);
create index on booking_events (booking_id, created_at);

create table broadcasts (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references bookings(id) on delete cascade,
  driver_id    uuid not null references drivers(id),
  radius_km    integer not null,
  sent_at      timestamptz default now(),
  responded_at timestamptz,
  response     text                    -- 'accepted' | 'declined' | 'expired'
);
create index on broadcasts (booking_id);
create index on broadcasts (driver_id, response);

-- Simulated live position, one row per active booking
create table trip_positions (
  booking_id      uuid primary key references bookings(id) on delete cascade,
  lat             double precision not null,
  lng             double precision not null,
  bearing         numeric(5,2) default 0,
  progress        numeric(5,4) not null default 0,  -- 0..1 along active leg
  leg             text not null default 'to_pickup', -- 'to_pickup' | 'to_drop'
  eta_min         integer,
  updated_at      timestamptz default now()
);
```

**Realtime:** enable Supabase Realtime on `bookings`, `booking_events`, `broadcasts`, `trip_positions`.

---

## 2. Seed data requirements

- **8 vehicle types** and **16 materials** exactly as tabulated in `BUSINESS_RULES.md` §1–§2.
- **12 demo drivers** distributed around Kochi/Ernakulam with realistic Kerala names and `KL 07` / `KL 40` registration numbers, covering all 8 vehicle classes (at least 2 drivers each for `tipper_100`, `tipper_200`, `lcv_14ft`, `tata_ace`). Home coordinates spread across Aluva, Perumbavoor, Kakkanad, Edappally, Tripunithura.
- **4 demo saved sites** for the default session.

---

## 3. API contract

All routes under `/api`. Zod-validated request and response. Return shape is always `{ data } | { error: { code, message } }`.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/catalogue` | Materials + vehicle types (cached) |
| `POST` | `/api/voice/parse` | `{ transcript, currentSlots }` → parsed slots + `nextQuestion` (see BUSINESS_RULES §6.4) |
| `POST` | `/api/geocode` | `{ query }` → Mapbox forward-geocode results, biased to Kerala |
| `POST` | `/api/route` | `{ pickup, drop }` → `{ distanceKm, durationMin, polyline }` |
| `POST` | `/api/quote` | `{ materialId, quantity, pickup, drop, labourNeeded, siteAccess, scheduledFor }` → vehicle options with itemised pricing |
| `POST` | `/api/bookings` | Create booking, status `SEARCHING`, start broadcast |
| `GET` | `/api/bookings/:id` | Full booking + driver + events + position |
| `GET` | `/api/bookings?session=` | History |
| `POST` | `/api/bookings/:id/cancel` | `{ actor, reason }` → validates §5.2 |
| `POST` | `/api/bookings/:id/reschedule` | `{ scheduledFor }` → validates §5.3 |
| `POST` | `/api/bookings/:id/pay` | Mock payment, sets `payment_status='paid'` |
| `GET` | `/api/driver/jobs?driverId=` | Broadcast jobs for this driver |
| `POST` | `/api/driver/accept` | `{ bookingId, driverId }` — atomic, first-wins |
| `POST` | `/api/driver/decline` | `{ bookingId, driverId }` |
| `POST` | `/api/driver/status` | `{ bookingId, status }` — forward-only validation |
| `POST` | `/api/driver/position` | `{ bookingId, lat, lng, progress, leg }` — simulator writes here |
| `POST` | `/api/driver/availability` | `{ driverId, isAvailable }` |

**Atomic acceptance** — the accept route must use a conditional update so two drivers cannot both win:

```sql
update bookings
   set status = 'ACCEPTED', driver_id = $driverId, updated_at = now()
 where id = $bookingId and status = 'SEARCHING' and driver_id is null
returning *;
```
Zero rows returned → respond `409 ALREADY_TAKEN`.

---

## 4. Broadcast worker

No queue infrastructure in MVP. Implement as a Next.js route handler `POST /api/bookings/:id/broadcast-tick`, called by:
- the client on the searching screen every 15s (belt and braces), and
- a Vercel Cron every minute for bookings still `SEARCHING`.

Each tick: read `created_at`, compute elapsed, widen `broadcast_radius_km` per the ladder in `BUSINESS_RULES.md` §5.1, insert `broadcasts` rows for newly-eligible drivers (deduplicated), and set `NO_DRIVERS` past 180s.

---

## 5. Position simulator

The driver dashboard runs a client-side ticker while a trip is active:
- On `ACCEPTED`: interpolate driver home → pickup over 90 simulated seconds.
- On `LOADED` → `IN_TRANSIT`: interpolate along `route_polyline` over 120 simulated seconds.
- Write to `/api/driver/position` every 2s; Supabase Realtime pushes to the user's tracking map.
- The user's map interpolates between received points with `motion` so the marker glides rather than jumps.

A `?real=1` query flag on `/driver` switches to `navigator.geolocation.watchPosition` instead, for field testing.

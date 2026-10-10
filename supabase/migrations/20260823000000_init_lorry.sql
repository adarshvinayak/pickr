-- ─────────────────────────────────────────────
-- PICKR — Initial Schema (DATA_MODEL.md)
-- ─────────────────────────────────────────────

create table if not exists vehicle_types (
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

create table if not exists materials (
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

create table if not exists drivers (
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

create table if not exists saved_sites (
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
create index if not exists idx_saved_sites_session on saved_sites (session_id, last_used desc);

-- ─────────────────────────────────────────────
-- Bookings
-- ─────────────────────────────────────────────

create table if not exists bookings (
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

  -- input provenance
  input_mode          text not null default 'manual', -- 'voice' | 'manual' | 'repeat'
  raw_transcript      text,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists idx_bookings_session on bookings (session_id, created_at desc);
create index if not exists idx_bookings_status on bookings (status);
create index if not exists idx_bookings_driver_status on bookings (driver_id, status);

create table if not exists booking_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  status      text not null,
  actor       text not null,          -- 'user' | 'driver' | 'system'
  note        text,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz default now()
);
create index if not exists idx_booking_events_booking on booking_events (booking_id, created_at);

create table if not exists broadcasts (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references bookings(id) on delete cascade,
  driver_id    uuid not null references drivers(id),
  radius_km    integer not null,
  sent_at      timestamptz default now(),
  responded_at timestamptz,
  response     text                    -- 'accepted' | 'declined' | 'expired'
);
create index if not exists idx_broadcasts_booking on broadcasts (booking_id);
create index if not exists idx_broadcasts_driver on broadcasts (driver_id, response);

-- Simulated live position, one row per active booking
create table if not exists trip_positions (
  booking_id      uuid primary key references bookings(id) on delete cascade,
  lat             double precision not null,
  lng             double precision not null,
  bearing         numeric(5,2) default 0,
  progress        numeric(5,4) not null default 0,  -- 0..1 along active leg
  leg             text not null default 'to_pickup', -- 'to_pickup' | 'to_drop'
  eta_min         integer,
  updated_at      timestamptz default now()
);

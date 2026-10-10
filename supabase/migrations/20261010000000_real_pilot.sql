-- Additive: preserves legacy demo tables. New runtime uses only pilot_* tables.
create extension if not exists pgcrypto;
create table public.pilot_accounts (
 id uuid primary key default gen_random_uuid(), name text not null, phone text not null,
 role text not null check(role in ('customer','driver','admin')), disabled boolean not null default false,
 password_hash text, created_at timestamptz not null default now(), unique(phone,role)
);
create table public.pilot_sessions (
 token_hash text primary key, account_id uuid not null references public.pilot_accounts(id) on delete cascade,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table public.pilot_settings (
 id boolean primary key default true check(id), allow_skips boolean not null default true,
 support_phone text not null default '', paused boolean not null default false,
 initial_radius_km integer not null default 5 check(initial_radius_km between 1 and 50),
 radius_step_km integer not null default 5 check(radius_step_km between 1 and 50)
);
insert into public.pilot_settings(id) values(true);
create table public.pilot_zones (
 id uuid primary key default gen_random_uuid(), name text not null, active boolean not null default true,
 polygon jsonb not null check(jsonb_array_length(polygon)>=3)
);
-- Operator must review this initial pilot service rectangle; not an official municipal boundary.
insert into public.pilot_zones(name,polygon) values('Thrissur pilot', '[[76.12,10.45],[76.30,10.45],[76.30,10.62],[76.12,10.62]]');
create table public.pilot_drivers (
 id uuid primary key references public.pilot_accounts(id) on delete cascade,
 vehicle_type_id text not null, vehicle_number text not null,
 approval text not null default 'pending' check(approval in ('pending','approved','rejected','test')),
 documents jsonb not null default '{}', onboarding_skipped boolean not null default false,
 online boolean not null default false, lat double precision, lng double precision, accuracy double precision,
 position_at timestamptz, device_at timestamptz, active_booking_id uuid
);
create table public.pilot_bookings (
 id uuid primary key default gen_random_uuid(), short_code text not null,
 customer_id uuid not null references public.pilot_accounts(id), driver_id uuid references public.pilot_drivers(id),
 status text not null default 'SEARCHING' check(status in ('SEARCHING','ACCEPTED','AT_PICKUP','IN_TRANSIT','AT_DROP','COMPLETED','CANCELLED','NO_DRIVERS')),
 payload jsonb not null, payment_status text not null default 'pending' check(payment_status in ('pending','paid')),
 request_key uuid not null, search_started_at timestamptz not null default now(), radius_km integer not null default 5,
 pickup_at timestamptz, loaded_at timestamptz, drop_at timestamptz, completed_at timestamptz, paid_at timestamptz,
 cancellation_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(customer_id,request_key)
);
create unique index pilot_one_driver_job on public.pilot_bookings(driver_id)
 where status in ('ACCEPTED','AT_PICKUP','IN_TRANSIT','AT_DROP') or (status='COMPLETED' and payment_status='pending');
create unique index pilot_one_customer_job on public.pilot_bookings(customer_id)
 where status in ('SEARCHING','ACCEPTED','AT_PICKUP','IN_TRANSIT','AT_DROP') or (status='COMPLETED' and payment_status='pending');
alter table public.pilot_drivers add constraint pilot_active_booking foreign key(active_booking_id) references public.pilot_bookings(id);
create table public.pilot_offers (
 booking_id uuid not null references public.pilot_bookings(id) on delete cascade,
 driver_id uuid not null references public.pilot_drivers(id) on delete cascade,
 response text check(response in ('declined','accepted','expired')), created_at timestamptz not null default now(),
 primary key(booking_id,driver_id)
);
create table public.pilot_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.pilot_accounts(id) on delete set null,
 booking_id uuid references public.pilot_bookings(id), action text not null, details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create table public.pilot_uploads (
 path text primary key, owner_id uuid not null references public.pilot_accounts(id), purpose text not null,
 created_at timestamptz not null default now()
);
create table public.pilot_saved_sites (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.pilot_accounts(id) on delete cascade,
 label text not null, address text not null, lat double precision not null, lng double precision not null
);
create table public.pilot_push_tokens (
 token text primary key, owner_id uuid not null references public.pilot_accounts(id) on delete cascade,
 updated_at timestamptz not null default now()
);
create table public.pilot_push_outbox (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.pilot_accounts(id),
 booking_id uuid references public.pilot_bookings(id), title text not null, body text not null,
 sent_at timestamptz, attempts integer not null default 0, created_at timestamptz not null default now()
);
create index on public.pilot_bookings(status,search_started_at);
create index on public.pilot_sessions(account_id);
create index on public.pilot_audit(booking_id,created_at);
create index on public.pilot_push_outbox(created_at) where sent_at is null;
-- Anonymous clients cannot read private accounts, identity documents, positions or trip data.
do $$ declare t text; begin
 foreach t in array array['pilot_accounts','pilot_sessions','pilot_settings','pilot_zones','pilot_drivers','pilot_bookings','pilot_offers','pilot_audit','pilot_uploads','pilot_saved_sites','pilot_push_tokens','pilot_push_outbox'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('pilot-private','pilot-private',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;

create or replace function public.pilot_inside(p_lat double precision,p_lng double precision,p_polygon jsonb)
returns boolean language plpgsql immutable set search_path=public as $$
declare inside boolean:=false; n int:=jsonb_array_length(p_polygon); i int; j int:=n-1; xi float8; yi float8; xj float8; yj float8;
begin
 for i in 0..n-1 loop
 xi:=(p_polygon->i->>0)::float8; yi:=(p_polygon->i->>1)::float8; xj:=(p_polygon->j->>0)::float8; yj:=(p_polygon->j->>1)::float8;
 if abs((p_lng-xi)*(yj-yi)-(p_lat-yi)*(xj-xi))<1e-9 and p_lng between least(xi,xj) and greatest(xi,xj) and p_lat between least(yi,yj) and greatest(yi,yj) then return true; end if;
 if (yi>p_lat)<>(yj>p_lat) then if p_lng<(xj-xi)*(p_lat-yi)/(yj-yi)+xi then inside:=not inside; end if; end if;
 j:=i;
 end loop;
 return inside;
end $$;
create or replace function public.pilot_distance(a float8,b float8,c float8,d float8)
returns float8 language sql immutable set search_path=public as $$ select 6371*2*asin(sqrt(least(1::float8,power(sin(radians(c-a)/2),2)+cos(radians(a))*cos(radians(c))*power(sin(radians(d-b)/2),2)))); $$;

create or replace function public.pilot_dispatch() returns void language plpgsql security definer set search_path=public as $$
declare b pilot_bookings; d pilot_drivers; cfg pilot_settings; radius int; seconds float8;
begin
 select * into cfg from pilot_settings where id;
 for b in select * from pilot_bookings where status='SEARCHING' for update skip locked loop
 if (b.payload->>'scheduledFor')::timestamptz>now() then continue; end if;
 seconds:=extract(epoch from now()-greatest(b.search_started_at,(b.payload->>'scheduledFor')::timestamptz));
 if seconds>=300 then
 update pilot_bookings set status='NO_DRIVERS',updated_at=now() where id=b.id;
 update pilot_offers set response='expired' where booking_id=b.id and response is null;
 insert into pilot_audit(booking_id,action) values(b.id,'search_expired');
 insert into pilot_push_outbox(owner_id,booking_id,title,body) values(b.customer_id,b.id,'No truck available','Your five-minute search expired. You can try again.');
 continue;
 end if;
 radius:=cfg.initial_radius_km+least(4,floor(seconds/60)::int)*cfg.radius_step_km;
 update pilot_bookings set radius_km=radius where id=b.id;
 if cfg.paused then continue; end if;
 for d in select x.* from pilot_drivers x join pilot_accounts a on a.id=x.id
 where x.online and not a.disabled and x.active_booking_id is null
 and (x.approval='approved' or (x.approval='test' and cfg.allow_skips))
 and x.position_at>now()-interval '90 seconds' and x.device_at>now()-interval '90 seconds' and x.accuracy<=150
 and x.vehicle_type_id=b.payload->>'vehicleTypeId'
 and exists(select 1 from pilot_zones z where z.active and pilot_inside(x.lat,x.lng,z.polygon))
 and pilot_distance(x.lat,x.lng,(b.payload->'pickup'->>'lat')::float8,(b.payload->'pickup'->>'lng')::float8)<=radius loop
 insert into pilot_offers(booking_id,driver_id) values(b.id,d.id) on conflict do nothing;
 if found then insert into pilot_push_outbox(owner_id,booking_id,title,body)
 values(d.id,b.id,'New truck request',b.payload->'pickup'->>'label'||' → '||(b.payload->'drop'->>'label')); end if;
 end loop;
 end loop;
end $$;

create or replace function public.pilot_accept(p_booking uuid,p_driver uuid,p_admin uuid default null)
returns public.pilot_bookings language plpgsql security definer set search_path=public as $$
declare b pilot_bookings; d pilot_drivers; cfg pilot_settings;
begin
 -- Consistent booking -> driver lock order for all mutations.
 select * into b from pilot_bookings where id=p_booking for update;
 select * into d from pilot_drivers where id=p_driver for update;
 select * into cfg from pilot_settings where id;
 if b.id is null or d.id is null then raise exception 'CONFLICT: Trip or driver missing'; end if;
 if b.driver_id=p_driver and b.status='ACCEPTED' then return b; end if;
 if b.status<>'SEARCHING' or b.driver_id is not null then raise exception 'ALREADY_TAKEN'; end if;
 if now()>=greatest(b.search_started_at,(b.payload->>'scheduledFor')::timestamptz)+interval '5 minutes' or (b.payload->>'scheduledFor')::timestamptz>now() then raise exception 'SEARCH_EXPIRED_OR_NOT_DUE'; end if;
 if cfg.paused then raise exception 'CONFLICT: Service paused'; end if;
 if d.active_booking_id is not null then raise exception 'DRIVER_BUSY'; end if;
 if exists(select 1 from pilot_accounts where id=p_driver and disabled) or not(d.approval='approved' or (d.approval='test' and cfg.allow_skips)) then raise exception 'FORBIDDEN: Driver not approved'; end if;
 if d.vehicle_type_id<>b.payload->>'vehicleTypeId' then raise exception 'CONFLICT: Wrong vehicle class'; end if;
 if p_admin is null then
 if not d.online or d.position_at is null or d.position_at<now()-interval '90 seconds' or d.device_at<now()-interval '90 seconds' or d.accuracy>150 then raise exception 'CONFLICT: Driver location is stale'; end if;
 if not exists(select 1 from pilot_offers where booking_id=p_booking and driver_id=p_driver and response is null) then raise exception 'FORBIDDEN: No eligible offer'; end if;
 if not exists(select 1 from pilot_zones where active and pilot_inside(d.lat,d.lng,polygon)) then raise exception 'FORBIDDEN: Outside service area'; end if;
 if pilot_distance(d.lat,d.lng,(b.payload->'pickup'->>'lat')::float8,(b.payload->'pickup'->>'lng')::float8)>b.radius_km then raise exception 'CONFLICT: Outside search radius'; end if;
 elsif not exists(select 1 from pilot_accounts where id=p_admin and role='admin' and not disabled) then raise exception 'FORBIDDEN'; end if;
 update pilot_bookings set driver_id=p_driver,status='ACCEPTED',updated_at=now() where id=p_booking returning * into b;
 update pilot_drivers set active_booking_id=p_booking where id=p_driver;
 update pilot_offers set response=case when driver_id=p_driver then 'accepted' else 'expired' end where booking_id=p_booking;
 update pilot_offers set response='expired' where driver_id=p_driver and booking_id<>p_booking and response is null;
 insert into pilot_audit(actor_id,booking_id,action) values(coalesce(p_admin,p_driver),p_booking,'ACCEPTED');
 insert into pilot_push_outbox(owner_id,booking_id,title,body) values(b.customer_id,b.id,'Truck confirmed','Your driver is on the way to pickup.');
 return b;
end $$;

create or replace function public.pilot_transition(p_booking uuid,p_actor uuid,p_action text,p_patch jsonb default '{}')
returns public.pilot_bookings language plpgsql security definer set search_path=public as $$
declare b pilot_bookings; a pilot_accounts; d pilot_drivers; cfg pilot_settings; expected text;
begin
 select * into b from pilot_bookings where id=p_booking for update;
 select * into a from pilot_accounts where id=p_actor;
 select * into cfg from pilot_settings where id;
 if b.id is null or a.id is null or a.disabled then raise exception 'FORBIDDEN'; end if;
 if a.role<>'admin' and b.driver_id is distinct from a.id and b.customer_id<>a.id then raise exception 'FORBIDDEN'; end if;
 if b.driver_id is not null then select * into d from pilot_drivers where id=b.driver_id for update; end if;
 if p_action='CANCEL' then
 if a.role<>'admin' and b.status not in ('SEARCHING','ACCEPTED') then raise exception 'INVALID_STAGE'; end if;
 if b.status in ('COMPLETED','CANCELLED') then raise exception 'INVALID_STAGE'; end if;
 if coalesce(p_patch->>'reason','')='' then raise exception 'CONFLICT: Cancellation reason required'; end if;
 update pilot_bookings set status='CANCELLED',cancellation_reason=p_patch->>'reason',updated_at=now() where id=b.id returning * into b;
 update pilot_drivers set active_booking_id=null where active_booking_id=b.id;
 update pilot_offers set response='expired' where booking_id=b.id and response is null;
 elsif p_action='RELEASE' then
 if a.role<>'admin' and a.id is distinct from b.driver_id then raise exception 'FORBIDDEN'; end if;
 if b.status<>'ACCEPTED' then raise exception 'INVALID_STAGE'; end if;
 update pilot_drivers set active_booking_id=null where active_booking_id=b.id;
 -- Preserve decline for released driver; reset other offers for this new search attempt.
 delete from pilot_offers where booking_id=b.id and driver_id<>b.driver_id;
 insert into pilot_offers(booking_id,driver_id,response) values(b.id,b.driver_id,'declined') on conflict(booking_id,driver_id) do update set response='declined';
 update pilot_bookings set status='SEARCHING',driver_id=null,search_started_at=now(),radius_km=cfg.initial_radius_km,updated_at=now() where id=b.id returning * into b;
 elsif p_action='RETRY' then
 if a.id<>b.customer_id and a.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 if b.status<>'NO_DRIVERS' then raise exception 'INVALID_STAGE'; end if;
 delete from pilot_offers where booking_id=b.id;
 update pilot_bookings set status='SEARCHING',search_started_at=now(),payload=jsonb_set(payload,'{scheduledFor}',to_jsonb(now())),updated_at=now() where id=b.id returning * into b;
 elsif p_action='PAY' then
 if a.role not in ('driver','admin') or (a.role='driver' and a.id is distinct from b.driver_id) then raise exception 'FORBIDDEN'; end if;
 if b.status<>'COMPLETED' then raise exception 'INVALID_STAGE'; end if;
 if b.payment_status='paid' then return b; end if;
 if p_patch->>'collectionMethod' not in ('cash','upi') then raise exception 'CONFLICT: Collection method required'; end if;
 update pilot_bookings set payment_status='paid',paid_at=now(),payload=payload||p_patch,updated_at=now() where id=b.id returning * into b;
 update pilot_drivers set active_booking_id=null where active_booking_id=b.id;
 else
 if a.role not in ('driver','admin') or (a.role='driver' and a.id is distinct from b.driver_id) then raise exception 'FORBIDDEN'; end if;
 expected:=case b.status when 'ACCEPTED' then 'AT_PICKUP' when 'AT_PICKUP' then 'IN_TRANSIT' when 'IN_TRANSIT' then 'AT_DROP' when 'AT_DROP' then 'COMPLETED' end;
 if expected is null or p_action<>expected then raise exception 'INVALID_STAGE'; end if;
 if p_action='IN_TRANSIT' and coalesce(jsonb_array_length(p_patch->'loadPhotos'),0)<2 and not(cfg.allow_skips and coalesce((p_patch->>'photosSkipped')::boolean,false)) then raise exception 'CONFLICT: At least two load photos required'; end if;
 update pilot_bookings set status=p_action,payload=payload||p_patch,updated_at=now(),
 pickup_at=case when p_action='AT_PICKUP' then now() else pickup_at end,
 loaded_at=case when p_action='IN_TRANSIT' then now() else loaded_at end,
 drop_at=case when p_action='AT_DROP' then now() else drop_at end,
 completed_at=case when p_action='COMPLETED' then now() else completed_at end where id=b.id returning * into b;
 -- Reservation intentionally remains until PAY.
 end if;
 insert into pilot_audit(actor_id,booking_id,action,details) values(a.id,b.id,p_action,p_patch);
 insert into pilot_push_outbox(owner_id,booking_id,title,body) values(b.customer_id,b.id,'Trip update',replace(b.status,'_',' '));
 return b;
end $$;

-- SECURITY DEFINER functions are server-only; default PUBLIC EXECUTE must be removed.
revoke all on function public.pilot_inside(float8,float8,jsonb),public.pilot_distance(float8,float8,float8,float8),public.pilot_dispatch(),public.pilot_accept(uuid,uuid,uuid),public.pilot_transition(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.pilot_inside(float8,float8,jsonb),public.pilot_distance(float8,float8,float8,float8),public.pilot_dispatch(),public.pilot_accept(uuid,uuid,uuid),public.pilot_transition(uuid,uuid,text,jsonb) to service_role;

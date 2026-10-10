-- Live routing cache is shared by all viewers. REST keys never leave the backend.
alter table public.pilot_drivers add column routing_profile jsonb;
create table public.pilot_navigation (
 booking_id uuid primary key references public.pilot_bookings(id) on delete cascade,
 driver_id uuid references public.pilot_drivers(id), stage text, result jsonb,
 updated_at timestamptz, error text, attempted_at timestamptz,
 next_at timestamptz not null default now(), lease uuid, lease_until timestamptz
);
create table public.pilot_road_reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.pilot_accounts(id),
 booking_id uuid references public.pilot_bookings(id), lat double precision not null check(lat between -90 and 90),
 lng double precision not null check(lng between -180 and 180),
 kind text not null check(kind in ('closure','flooding','accident','congestion','site_access')),
 notes text not null check(length(notes) between 3 and 500),
 status text not null default 'pending' check(status in ('pending','verified','dismissed')),
 expires_at timestamptz not null default now()+interval '2 hours', created_at timestamptz not null default now()
);
alter table public.pilot_navigation enable row level security;
alter table public.pilot_road_reports enable row level security;
revoke all on public.pilot_navigation,public.pilot_road_reports from public,anon,authenticated;
grant all on public.pilot_navigation,public.pilot_road_reports to service_role;
create index pilot_road_reports_active on public.pilot_road_reports(status,expires_at);

create function public.pilot_navigation_claim(p_booking uuid,p_stage text,p_driver uuid,p_early boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid:=gen_random_uuid(); v_booking pilot_bookings; v_row pilot_navigation;
begin
 select * into v_booking from pilot_bookings where id=p_booking;
 if not found or v_booking.status<>p_stage or v_booking.driver_id is distinct from p_driver or p_stage not in ('ACCEPTED','IN_TRANSIT') then return null;end if;
 insert into pilot_navigation(booking_id) values(p_booking) on conflict do nothing;
 select * into v_row from pilot_navigation where booking_id=p_booking for update;
 if v_row.lease_until>now() then return null;end if;
 if v_row.stage is not distinct from p_stage and v_row.driver_id is not distinct from p_driver and
 ((not p_early and v_row.next_at>now()) or (p_early and v_row.attempted_at>now()-interval '20 seconds')) then return null;end if;
 update pilot_navigation set lease=v_id,lease_until=now()+interval '25 seconds',attempted_at=now(),next_at=now()+interval '60 seconds' where booking_id=p_booking;
 return v_id;
end $$;
create function public.pilot_navigation_finish(p_booking uuid,p_lease uuid,p_stage text,p_driver uuid,p_result jsonb,p_error text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 -- Lock the booking first, like trip transitions. Discard results from an old assignment/stage.
 perform 1 from pilot_bookings where id=p_booking and status=p_stage and driver_id=p_driver for update;
 if not found then
  update pilot_navigation set lease=null,lease_until=null where booking_id=p_booking and lease=p_lease;return false;
 end if;
 update pilot_navigation set driver_id=p_driver,stage=p_stage,
 result=case when p_result is not null then p_result when stage=p_stage and driver_id=p_driver then result else null end,
 updated_at=case when p_result is not null then now() when stage=p_stage and driver_id=p_driver then updated_at else null end,
 error=p_error,lease=null,lease_until=null where booking_id=p_booking and lease=p_lease;
 return found;
end $$;
revoke all on function public.pilot_navigation_claim(uuid,text,uuid,boolean),public.pilot_navigation_finish(uuid,uuid,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.pilot_navigation_claim(uuid,text,uuid,boolean),public.pilot_navigation_finish(uuid,uuid,text,uuid,jsonb,text) to service_role;

-- Preserve routing measurements throughout active work even under an onboarding/accept race.
create or replace function public.pilot_driver_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if old.active_booking_id is not null and (new.approval<>old.approval or new.vehicle_type_id<>old.vehicle_type_id or new.vehicle_number<>old.vehicle_number or new.routing_profile is distinct from old.routing_profile or not new.online) then raise exception 'DRIVER_BUSY: Cannot edit/offline an active driver';end if;
 return new;
end $$;

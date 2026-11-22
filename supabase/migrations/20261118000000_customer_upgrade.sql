-- Additive customer profile, persistent customer PIN and two-sided trip ratings.
alter table public.pilot_accounts add column if not exists profile jsonb not null default '{}';
alter table public.pilot_accounts add column if not exists start_pin text not null default lpad((floor(random()*10000))::int::text,4,'0') check(start_pin ~ '^[0-9]{4}$');
alter table public.pilot_saved_sites add column if not exists pinned boolean not null default false;
alter table public.pilot_saved_sites add column if not exists uses integer not null default 0;
alter table public.pilot_bookings add column if not exists pin_attempts integer not null default 0;
alter table public.pilot_bookings add column if not exists pin_lock_until timestamptz;
create table public.pilot_ratings (
 id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.pilot_bookings(id),
 author_id uuid not null references public.pilot_accounts(id),subject_id uuid not null references public.pilot_accounts(id),
 rating integer not null check(rating between 1 and 5),comment text not null default '' check(length(comment)<=500),
 created_at timestamptz not null default now(),unique(booking_id,author_id),check(author_id<>subject_id)
);
alter table public.pilot_ratings enable row level security;
revoke all on public.pilot_ratings from anon,authenticated;
create index on public.pilot_ratings(subject_id);
-- All paths, including operator progression, must verify the customer PIN before departure.
create function public.pilot_pin_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if old.status='AT_PICKUP' and new.status='IN_TRANSIT' and current_setting('pickr.pin_booking',true) is distinct from new.id::text then
 raise exception 'CONFLICT: Verify the customer start PIN before departure';
 end if;return new;
end $$;
create trigger pilot_start_pin_guard before update of status on public.pilot_bookings for each row execute function public.pilot_pin_guard();
create function public.pilot_start_trip(p_booking uuid,p_actor uuid,p_pin text,p_patch jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare b pilot_bookings;a pilot_accounts;expected text;result pilot_bookings;
begin
 select * into b from pilot_bookings where id=p_booking for update;
 select * into a from pilot_accounts where id=p_actor;
 if a.id is null or a.disabled or a.role not in ('driver','admin') or (a.role='driver' and b.driver_id is distinct from a.id) then raise exception 'FORBIDDEN';end if;
 if b.status<>'AT_PICKUP' then raise exception 'INVALID_STAGE';end if;
 if b.pin_lock_until>now() then return jsonb_build_object('error','Too many incorrect PIN attempts. Try again in five minutes.');end if;
 select start_pin into expected from pilot_accounts where id=b.customer_id;
 if p_pin is distinct from expected then
 update pilot_bookings set pin_attempts=case when pin_lock_until<=now() then 1 else pin_attempts+1 end,
 pin_lock_until=case when pin_attempts>=4 and (pin_lock_until is null or pin_lock_until>now()) then now()+interval '5 minutes' else null end where id=b.id;
 return jsonb_build_object('error','Incorrect customer PIN. Ask the customer to check their PIN.');
 end if;
 perform set_config('pickr.pin_booking',b.id::text,true);
 result:=pilot_transition(p_booking,p_actor,'IN_TRANSIT',p_patch);
 update pilot_bookings set pin_attempts=0,pin_lock_until=null where id=b.id;
 return jsonb_build_object('booking',to_jsonb(result));
end $$;
revoke all on function public.pilot_start_trip(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.pilot_start_trip(uuid,uuid,text,jsonb) to service_role;

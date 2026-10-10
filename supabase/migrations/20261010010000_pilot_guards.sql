-- Server-side guards for configuration races and private driver documents.
create table public.pilot_rate_limits(key text primary key, started_at timestamptz not null default now(), attempts integer not null default 1);
alter table public.pilot_rate_limits enable row level security;
revoke all on public.pilot_rate_limits from anon,authenticated;
create or replace function public.pilot_login_limit(p_key text,p_limit integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare count integer;
begin
 insert into pilot_rate_limits(key) values(p_key) on conflict(key) do update
 set attempts=case when pilot_rate_limits.started_at<now()-interval '15 minutes' then 1 else pilot_rate_limits.attempts+1 end,
 started_at=case when pilot_rate_limits.started_at<now()-interval '15 minutes' then now() else pilot_rate_limits.started_at end
 returning attempts into count;
 return count<=p_limit;
end $$;
create or replace function public.pilot_booking_guard() returns trigger language plpgsql set search_path=public as $$
declare a pilot_accounts;
begin
 select * into a from pilot_accounts where id=new.customer_id for update;
 if a.disabled or a.role<>'customer' then raise exception 'FORBIDDEN: Customer disabled';end if;
 if exists(select 1 from pilot_settings where paused) then raise exception 'CONFLICT: Service paused';end if;
 if not exists(select 1 from pilot_zones where active and pilot_inside((new.payload->'pickup'->>'lat')::float8,(new.payload->'pickup'->>'lng')::float8,polygon)) or not exists(select 1 from pilot_zones where active and pilot_inside((new.payload->'drop'->>'lat')::float8,(new.payload->'drop'->>'lng')::float8,polygon)) then raise exception 'FORBIDDEN: Sites outside service area';end if;
 return new;
end $$;
create trigger pilot_booking_customer_guard before insert on public.pilot_bookings for each row execute function public.pilot_booking_guard();
create or replace function public.pilot_account_edit(p_actor uuid,p_target uuid,p_patch jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare a pilot_accounts;
begin
 if not exists(select 1 from pilot_accounts where id=p_actor and role='admin' and not disabled) then raise exception 'FORBIDDEN';end if;
 -- Driver lock serializes edits/suspension against acceptance. Customer row lock serializes inserts.
 perform 1 from pilot_drivers where id=p_target for update;
 select * into a from pilot_accounts where id=p_target for update;
 if a.id is null then raise exception 'CONFLICT: Account missing';end if;
 if exists(select 1 from pilot_bookings where (customer_id=p_target or driver_id=p_target) and (status in ('SEARCHING','ACCEPTED','AT_PICKUP','IN_TRANSIT','AT_DROP') or (status='COMPLETED' and payment_status='pending'))) then raise exception 'DRIVER_BUSY: Finish or cancel active work first';end if;
 if p_target=p_actor and coalesce((p_patch->>'disabled')::boolean,false) then raise exception 'FORBIDDEN: Cannot disable own admin';end if;
 update pilot_accounts set name=coalesce(p_patch->>'name',name),phone=coalesce(p_patch->>'phone',phone),disabled=coalesce((p_patch->>'disabled')::boolean,disabled),password_hash=coalesce(p_patch->>'password_hash',password_hash) where id=p_target;
 if coalesce((p_patch->>'disabled')::boolean,false) then delete from pilot_sessions where account_id=p_target;update pilot_drivers set online=false where id=p_target;end if;
 insert into pilot_audit(actor_id,action,details) values(p_actor,'ADMIN_ACCOUNT_EDIT',jsonb_build_object('target',p_target,'disabled',p_patch->'disabled'));
end $$;
create or replace function public.pilot_driver_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if old.active_booking_id is not null and (new.approval<>old.approval or new.vehicle_type_id<>old.vehicle_type_id or new.vehicle_number<>old.vehicle_number or not new.online) then raise exception 'DRIVER_BUSY: Cannot edit/offline an active driver';end if;
 return new;
end $$;
create trigger pilot_driver_edit_guard before update on public.pilot_drivers for each row execute function public.pilot_driver_guard();
revoke all on function public.pilot_login_limit(text,integer),public.pilot_booking_guard(),public.pilot_account_edit(uuid,uuid,jsonb),public.pilot_driver_guard() from public,anon,authenticated;
grant execute on function public.pilot_login_limit(text,integer),public.pilot_account_edit(uuid,uuid,jsonb) to service_role;
-- Explicit grants avoid reliance on dashboard default privileges. RLS bypass is Supabase's service_role.
do $$ declare t text; begin foreach t in array array['pilot_accounts','pilot_sessions','pilot_settings','pilot_zones','pilot_drivers','pilot_bookings','pilot_offers','pilot_audit','pilot_uploads','pilot_saved_sites','pilot_push_tokens','pilot_push_outbox','pilot_rate_limits'] loop execute format('grant all on public.%I to service_role',t);end loop;end $$;
alter table public.pilot_settings add column require_device_area boolean not null default false;

-- Driver release is allowed until loading finishes. Reset pickup timer on reassignment.
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
 if b.status not in ('ACCEPTED','AT_PICKUP') then raise exception 'INVALID_STAGE'; end if;
 update pilot_drivers set active_booking_id=null where active_booking_id=b.id;
 -- Preserve decline for released driver; reset other offers for this new search attempt.
 delete from pilot_offers where booking_id=b.id and driver_id<>b.driver_id;
 insert into pilot_offers(booking_id,driver_id,response) values(b.id,b.driver_id,'declined') on conflict(booking_id,driver_id) do update set response='declined';
 update pilot_bookings set status='SEARCHING',driver_id=null,pickup_at=null,search_started_at=now(),radius_km=cfg.initial_radius_km,updated_at=now() where id=b.id returning * into b;
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

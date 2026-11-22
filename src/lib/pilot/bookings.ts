import {submitRating} from './customer';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PRICING_CONFIG } from '@/config/pricing';
import { getMaterialById } from '@/config/materials';
import { getVehicleById } from '@/config/vehicles';
import { calculateQuote } from '@/lib/pricing';
import { ApiError, audit, check, database, identity, json } from './server';
import { coverage, IntakeSchema, quote, readQuote } from './quotes';
import type { BookingData, Trip } from './model';
export async function quoteRoute(req: NextRequest): Promise<NextResponse> { await identity(req,['customer','admin']); return NextResponse.json({data:await quote(IntakeSchema.parse(await json(req)))}); }
export async function createBooking(req: NextRequest): Promise<NextResponse> {
 const account=await identity(req,['customer']); const input=IntakeSchema.extend({vehicleTypeId:z.string(),quoteToken:z.string().max(100000),requestKey:z.string().uuid(),transitPassPhoto:z.string().max(500).optional()}).parse(await json(req));
 const db=database(); const existing=check(await db.from('pilot_bookings').select('*').eq('customer_id',account.id).eq('request_key',input.requestKey).maybeSingle());
 if(existing) return NextResponse.json({data:existing});
 await coverage(input); const signed=readQuote(input.quoteToken,IntakeSchema.parse(input),input.vehicleTypeId);
 if(input.transitPassPhoto&&!check(await db.from('pilot_uploads').select('path').eq('owner_id',account.id).eq('purpose','pass').eq('path',input.transitPassPhoto).maybeSingle()))throw new ApiError(400,'Upload your transit pass first.');
 const material=getMaterialById(input.materialId)!;
 const payload:BookingData={transitPassPhoto:input.transitPassPhoto,...signed.input,scheduledFor:signed.input.scheduledFor!,unit:material.nativeUnit,labourNeeded:!material.selfTipping&&input.labourNeeded,vehicleTypeId:input.vehicleTypeId,...signed.route,quote:signed.price,customerName:account.name,customerPhone:account.phone};
 const created=await db.from('pilot_bookings').insert({short_code:`PK-${crypto.randomUUID().slice(0,8).toUpperCase()}`,customer_id:account.id,request_key:input.requestKey,payload}).select('*').single();
 if(created.error?.code==='23505') { const duplicate=check(await db.from('pilot_bookings').select('*').eq('customer_id',account.id).eq('request_key',input.requestKey).maybeSingle()); if(duplicate) return NextResponse.json({data:duplicate}); throw new ApiError(409,'You already have an active booking. Open your trips.'); }
 const booking=check(created); await audit(account.id,'BOOKED',{},booking.id); check(await db.rpc('pilot_dispatch')); return NextResponse.json({data:booking});
}
export async function tripAction(req: NextRequest,id: string): Promise<NextResponse> {
 z.string().uuid().parse(id); const actor=await identity(req); const db=database();
 const input=z.object({startPin:z.string().regex(/^\d{4}$/).optional(),action:z.enum(['AT_PICKUP','IN_TRANSIT','AT_DROP','COMPLETED','PAY','CANCEL','RELEASE','RETRY','REVIEW']),loadPhotos:z.array(z.string()).max(8).optional(),photosSkipped:z.boolean().optional(),reason:z.string().trim().min(3).max(500).optional(),collectionMethod:z.enum(['cash','upi']).optional(),collectionReference:z.string().max(100).optional(),rating:z.number().int().min(1).max(5).optional(),comment:z.string().max(1000).optional()}).parse(await json(req));
 const trip=check(await db.from('pilot_bookings').select('*').eq('id',id).single()) as Trip;
 if(actor.role!=='admin'&&trip.customer_id!==actor.id&&trip.driver_id!==actor.id) throw new ApiError(403,'This trip belongs to another account.');
 if(input.action==='REVIEW') return submitRating(req,id,actor,trip,input);
 // Driver cancellation means release and rebroadcast, rather than terminating the customer request.
 if(actor.role==='driver'&&input.action==='CANCEL')input.action='RELEASE';
 const patch:Record<string,unknown>={};
 if(input.action==='IN_TRANSIT') {
  const photos=input.loadPhotos||[];
  if(photos.length) { const owned=check(await db.from('pilot_uploads').select('path').eq('owner_id',actor.id).eq('purpose','load').in('path',photos)); if(owned.length!==photos.length) throw new ApiError(400,'Upload load photos from this account first.'); }
  patch.loadPhotos=photos; patch.photosSkipped=input.photosSkipped||false;
 }
 if(input.action==='COMPLETED') {
  const pickupMinutes=trip.pickup_at&&trip.loaded_at?(Date.parse(trip.loaded_at)-Date.parse(trip.pickup_at))/60000:0;
  const dropMinutes=trip.drop_at?(Date.now()-Date.parse(trip.drop_at))/60000:0;
  patch.quote=calculateQuote({vehicleTypeId:trip.payload.vehicleTypeId,distanceKm:trip.payload.distanceKm,labourNeeded:trip.payload.labourNeeded,scheduledFor:trip.payload.scheduledFor,isExpress:false,waitingMinutesPickup:pickupMinutes,waitingMinutesDrop:dropMinutes});
 }
 if(input.action==='CANCEL') { patch.reason=input.reason||''; patch.cancellationFee=trip.status==='ACCEPTED'&&actor.role==='customer'?Math.min(PRICING_CONFIG.cancellation.userFeeAfterAccepted,Math.round(trip.payload.quote.totalFare*PRICING_CONFIG.cancellation.userFeePercentage)):0; }
 if(input.action==='PAY') {patch.collectionMethod=input.collectionMethod;patch.collectionReference=input.collectionReference||'';}
 if(!getVehicleById(trip.payload.vehicleTypeId)) throw new ApiError(400,'Unknown truck class.');
 if(input.action==='IN_TRANSIT'){const verified=check(await db.rpc('pilot_start_trip',{p_booking:id,p_actor:actor.id,p_pin:input.startPin||'',p_patch:patch}));if(verified.error)throw new ApiError(409,verified.error);return NextResponse.json({data:verified.booking});}
 const changed=check(await db.rpc('pilot_transition',{p_booking:id,p_actor:actor.id,p_action:input.action,p_patch:patch}));
 if(input.action==='RETRY'||input.action==='RELEASE') check(await db.rpc('pilot_dispatch')); return NextResponse.json({data:changed});
}

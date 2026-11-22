import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TruckSchema } from '@/lib/maps';
import { getVehicleById } from '@/config/vehicles';
import { serviceable } from './geo';
import type { DriverProfile, Settings, Zone } from './model';
import { ApiError, audit, check, database, identity, json } from './server';
export async function onboard(req:NextRequest):Promise<NextResponse> {
 const account=await identity(req,['driver']); const input=z.object({vehicleTypeId:z.string(),vehicleNumber:z.string().trim().min(6).max(20).transform(v=>v.toUpperCase()),skip:z.boolean().default(false),routingProfile:TruckSchema.nullable().optional(),documents:z.record(z.string()).default({})}).parse(await json(req));
 if(!getVehicleById(input.vehicleTypeId)) throw new ApiError(400,'Select a listed vehicle.');
 if(!input.skip&&!input.routingProfile)throw new ApiError(400,'Enter vehicle dimensions, gross weight and axle load for truck routing.');
 const db=database(); const cfg=check(await db.from('pilot_settings').select('*').single()) as Settings;
 if(input.skip&&!cfg.allow_skips) throw new ApiError(403,'Testing skips are disabled.');
 const current=check(await db.from('pilot_drivers').select('*').eq('id',account.id).maybeSingle()) as DriverProfile|null;
 if(current?.active_booking_id) throw new ApiError(409,'Finish your active trip before editing onboarding.');
 if(!input.skip&&['registration','rc','license','aadhaar'].some(k=>!input.documents[k])) throw new ApiError(400,'Upload all four documents.');
 const paths=Object.values(input.documents);
 if(paths.length) {const owned=check(await db.from('pilot_uploads').select('path').eq('owner_id',account.id).eq('purpose','document').in('path',paths)); if(owned.length!==paths.length) throw new ApiError(400,'Upload documents from this account.');}
 const driver=check(await db.from('pilot_drivers').upsert({id:account.id,vehicle_type_id:input.vehicleTypeId,vehicle_number:input.vehicleNumber,documents:input.documents,routing_profile:input.routingProfile||null,approval:input.skip?'test':'pending',onboarding_skipped:input.skip,online:false}).select('*').single());
 await audit(account.id,input.skip?'ONBOARDING_SKIPPED':'ONBOARDING_SUBMITTED'); return NextResponse.json({data:driver});
}
export async function position(req:NextRequest):Promise<NextResponse> {
 const account=await identity(req,['driver']); const input=z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),accuracy:z.number().min(0).max(10000),sampledAt:z.string().datetime()}).parse(await json(req));
 const now=Date.now(); const sampled=Date.parse(input.sampledAt); if(sampled>now+30000||sampled<now-90000) throw new ApiError(400,'GPS sample is stale or clock is incorrect.');
 const db=database(); const update=await db.from('pilot_drivers').update({lat:input.lat,lng:input.lng,accuracy:input.accuracy,position_at:input.sampledAt,device_at:new Date().toISOString()}).eq('id',account.id).or(`position_at.is.null,position_at.lte.${input.sampledAt}`).select('id'); check(update);
 return NextResponse.json({data:true});
}
export async function availability(req:NextRequest):Promise<NextResponse> {
 const account=await identity(req,['driver']); const {online}=z.object({online:z.boolean()}).parse(await json(req)); const db=database();
 const profile=check(await db.from('pilot_drivers').select('*').eq('id',account.id).single()) as DriverProfile;
 const cfg=check(await db.from('pilot_settings').select('*').single()) as Settings;
 if(online) {
  if(profile.approval!=='approved'&&!(profile.approval==='test'&&cfg.allow_skips)) throw new ApiError(403,'Admin approval is pending.');
  const zones=check(await db.from('pilot_zones').select('*').eq('active',true)) as Zone[];
  if(profile.lat===null||profile.lng===null||!profile.position_at||Date.parse(profile.position_at)<Date.now()-90000||profile.accuracy===null||profile.accuracy>150) throw new ApiError(422,'Enable GPS and wait for an accurate current location before going online.');
  if(!serviceable({lat:profile.lat,lng:profile.lng},zones)) throw new ApiError(422,'Your current area is not serviceable.');
  if(cfg.paused) throw new ApiError(422,'Service is paused by the admin.');
 } else if(profile.active_booking_id) throw new ApiError(409,'Complete and collect payment before going offline.');
 check(await db.from('pilot_drivers').update({online,device_at:new Date().toISOString()}).eq('id',account.id)); await audit(account.id,online?'ONLINE':'OFFLINE'); return NextResponse.json({data:true});
}
export async function offer(req:NextRequest,id:string):Promise<NextResponse> {
 z.string().uuid().parse(id); const account=await identity(req,['driver']); const {action}=z.object({action:z.enum(['accept','decline'])}).parse(await json(req)); const db=database();
 if(action==='accept') return NextResponse.json({data:check(await db.rpc('pilot_accept',{p_booking:id,p_driver:account.id}))});
 const result=check(await db.from('pilot_offers').update({response:'declined'}).eq('booking_id',id).eq('driver_id',account.id).is('response',null).select('booking_id'));
 if(!result.length) throw new ApiError(409,'Offer is no longer available.'); await audit(account.id,'DECLINED',{},id); return NextResponse.json({data:true});
}

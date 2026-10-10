import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateRoute,TruckSchema } from '@/lib/mappls';
import { routeDeviationMeters } from './navigation-geo';
import { calculateHaversineDistanceKm } from './geo';
import { ApiError, audit,check,database,identity,json } from './server';
import type { Navigation, RoadReport, Trip } from './model';
const MOVING=['ACCEPTED','IN_TRANSIT'];
export async function attachNavigation(trips:Trip[]):Promise<Trip[]> {
 const active=trips.filter(t=>MOVING.includes(t.status)&&t.driver_id);if(!active.length)return trips;
 const rows=check(await database().from('pilot_navigation').select('*').in('booking_id',active.map(t=>t.id))) as Navigation[];
 return trips.map(t=>({...t,navigation:rows.find(n=>n.booking_id===t.id&&n.stage===t.status&&n.driver_id===t.driver_id)}));
}
export async function refreshRoutes(onlyId?:string):Promise<number> {
 const db=database();let query=db.from('pilot_bookings').select('*').in('status',MOVING).not('driver_id','is',null).order('updated_at');if(onlyId)query=query.eq('id',onlyId);
 const trips=check(await query.limit(100)) as Trip[];if(!trips.length)return 0;
 const profiles=check(await db.from('pilot_drivers').select('*').in('id',trips.map(t=>t.driver_id!)));
 const cached=check(await db.from('pilot_navigation').select('*').in('booking_id',trips.map(t=>t.id))) as Navigation[];
 const reports=check(await db.from('pilot_road_reports').select('id,lat,lng,kind,notes,status,expires_at').eq('status','verified').gt('expires_at',new Date().toISOString())) as RoadReport[];
 let refreshed=0;
 // Bound provider calls; cached snapshots never invoke paid routing APIs.
 for(const trip of trips){
  const driver=profiles.find(d=>d.id===trip.driver_id);const previous=cached.find(n=>n.booking_id===trip.id);
  if(!driver||driver.lat===null||driver.lng===null||driver.accuracy===null||driver.accuracy>150||!driver.position_at||Date.parse(driver.position_at)<Date.now()-60000)continue;
  const origin={lat:driver.lat as number,lng:driver.lng as number};const target=trip.status==='ACCEPTED'?trip.payload.pickup:trip.payload.drop;
  const deviation=previous?.result&&driver.accuracy<=50?routeDeviationMeters(origin,previous.result.polyline):0;
  const early=Boolean(previous?.result&&deviation>100);
  const lease=check(await db.rpc('pilot_navigation_claim',{p_booking:trip.id,p_stage:trip.status,p_driver:trip.driver_id,p_early:early}));if(!lease)continue;
  try{
   const truck=TruckSchema.safeParse(driver.routing_profile);
   const relevant=reports.filter(r=>previous?.result?routeDeviationMeters(r,previous.result.polyline)<250:calculateHaversineDistanceKm(origin.lat,origin.lng,r.lat,r.lng)<30);
   const route=await calculateRoute(origin,target,{truck:truck.success?truck.data:null,avoid:relevant.filter(r=>['closure','flooding'].includes(r.kind))});
   const result={...route,origin,positionAt:driver.position_at,eta:new Date(Date.now()+route.durationSeconds*1000).toISOString(),target:trip.status==='ACCEPTED'?'pickup':'destination',reason:early?'route_deviation':'periodic',reports:reports.filter(r=>routeDeviationMeters(r,route.polyline)<250||relevant.some(a=>a.id===r.id))};
   check(await db.rpc('pilot_navigation_finish',{p_booking:trip.id,p_lease:lease,p_stage:trip.status,p_driver:trip.driver_id,p_result:result,p_error:null}));
  }catch(error){
   // Store a safe message, never provider URLs/keys. Preserve the last successful route.
   const message=error instanceof ApiError?error.message:'Route refresh failed. Last route is retained; call support if needed.';
   check(await db.rpc('pilot_navigation_finish',{p_booking:trip.id,p_lease:lease,p_stage:trip.status,p_driver:trip.driver_id,p_result:null,p_error:message}));
  }
  refreshed++;if(refreshed>=4)break;
 }return refreshed;
}
export async function navigationRefresh(req:NextRequest,id:string):Promise<NextResponse>{
 z.string().uuid().parse(id);const actor=await identity(req);const trip=check(await database().from('pilot_bookings').select('*').eq('id',id).single()) as Trip;
 if(actor.role!=='admin'&&actor.id!==trip.customer_id&&actor.id!==trip.driver_id)throw new ApiError(403,'This trip belongs to another account.');
 await refreshRoutes(id);return NextResponse.json({data:true});
}
export async function roadReports(req:NextRequest):Promise<NextResponse>{
 const actor=await identity(req,['driver','admin']);const db=database();
 if(req.method==='GET'){if(actor.role!=='admin')throw new ApiError(403,'Admin access required.');return NextResponse.json({data:check(await db.from('pilot_road_reports').select('*').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(100))});}
 const input=z.object({id:z.string().uuid().optional(),status:z.enum(['verified','dismissed']).optional(),bookingId:z.string().uuid().optional(),lat:z.number().min(-90).max(90).optional(),lng:z.number().min(-180).max(180).optional(),kind:z.enum(['closure','flooding','accident','congestion','site_access']).optional(),notes:z.string().trim().min(3).max(500).optional()}).parse(await json(req));
 if(input.id){if(actor.role!=='admin'||!input.status)throw new ApiError(403,'Admin review is required.');check(await db.from('pilot_road_reports').update({status:input.status}).eq('id',input.id));}
 else{
  if(input.lat===undefined||input.lng===undefined||!input.kind||!input.notes)throw new ApiError(400,'Select a location and describe the road issue.');
  if(actor.role==='driver'){
   if(!input.bookingId)throw new ApiError(400,'Report road issues from your active trip.');
   const trip=check(await db.from('pilot_bookings').select('driver_id,status').eq('id',input.bookingId).single());if(trip.driver_id!==actor.id||!['ACCEPTED','AT_PICKUP','IN_TRANSIT','AT_DROP'].includes(trip.status))throw new ApiError(403,'Only your active trip can be reported.');
   const recent=check(await db.from('pilot_road_reports').select('id').eq('reporter_id',actor.id).gt('created_at',new Date(Date.now()-60000).toISOString()));if(recent.length)throw new ApiError(429,'Wait one minute before adding another report.');
  }
  check(await db.from('pilot_road_reports').insert({reporter_id:actor.id,booking_id:input.bookingId,lat:input.lat,lng:input.lng,kind:input.kind,notes:input.notes,status:actor.role==='admin'?'verified':'pending'}));
 }
 // Verified closures invalidate the cache; in-flight responses are discarded by lease token.
 if(actor.role==='admin')check(await db.from('pilot_navigation').update({next_at:new Date().toISOString(),lease:null,lease_until:null}).not('booking_id','is',null));
 await audit(actor.id,'ROAD_REPORT',{id:input.id,status:input.status,kind:input.kind},input.bookingId);
 return NextResponse.json({data:true});
}

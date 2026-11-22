import { NextRequest, NextResponse } from 'next/server';
import { calculateHaversineDistanceKm } from './geo';
import { attachNavigation } from './navigation';
import { serviceable } from './geo';
import type { Settings,Zone } from './model';
import { check, database, identity } from './server';
import type { Account, DriverProfile, Trip } from './model';
export async function snapshot(req:NextRequest):Promise<NextResponse> {
 const account=await identity(req); const db=database(); check(await db.rpc('pilot_dispatch'));
 let trips:Trip[]=[]; let offers:Trip[]=[]; let driver:DriverProfile|null=null;
 if(account.role==='driver') {
 driver=check(await db.from('pilot_drivers').select('*').eq('id',account.id).maybeSingle()) as DriverProfile|null;
 check(await db.from('pilot_drivers').update({device_at:new Date().toISOString()}).eq('id',account.id));
 trips=check(await db.from('pilot_bookings').select('*').eq('driver_id',account.id).order('created_at',{ascending:false}).limit(100)) as Trip[];
 if(driver?.online&&!driver.active_booking_id) {
 const invitations=check(await db.from('pilot_offers').select('booking_id').eq('driver_id',account.id).is('response',null));
 if(invitations.length) offers=check(await db.from('pilot_bookings').select('*').in('id',invitations.map(o=>o.booking_id)).eq('status','SEARCHING')) as Trip[];
 }
 } else {
 let query=db.from('pilot_bookings').select('*').order('created_at',{ascending:false}).limit(account.role==='admin'?300:100);
 if(account.role==='customer') query=query.eq('customer_id',account.id);
 trips=check(await query) as Trip[];
 }
 const driverIds=[...new Set(trips.map(t=>t.driver_id).filter((id):id is string=>Boolean(id)))];
 if(driverIds.length) {
 const profiles=check(await db.from('pilot_drivers').select('id,vehicle_type_id,vehicle_number,lat,lng,accuracy,position_at,routing_profile,approval').in('id',driverIds));
 const names=check(await db.from('pilot_accounts').select('id,name,phone').in('id',driverIds)) as Account[];
 trips=trips.map(t=>({...t,driver:t.driver_id?{...profiles.find(d=>d.id===t.driver_id),...names.find(a=>a.id===t.driver_id)} as Trip['driver']:undefined}));
 }
 trips=await attachNavigation(trips);
 const ratings=check(await db.from('pilot_ratings').select('booking_id,author_id,subject_id,rating,comment').in('booking_id',trips.length?trips.map(t=>t.id):['00000000-0000-0000-0000-000000000000']));
 trips=trips.map(t=>({...t,ratings:ratings.filter(r=>r.booking_id===t.id),payload:{...t.payload,review:ratings.find(r=>r.booking_id===t.id&&r.author_id===t.customer_id)||t.payload.review,driverReview:ratings.find(r=>r.booking_id===t.id&&r.author_id===t.driver_id)}}));
 const own=check(await db.from('pilot_ratings').select('rating').eq('subject_id',account.id));account.rating={average:own.length?own.reduce((n,r)=>n+r.rating,0)/own.length:null,count:own.length};
 if(account.role==='customer'){const privateProfile=check(await db.from('pilot_accounts').select('start_pin,profile').eq('id',account.id).single());account.startPin=privateProfile.start_pin;account.profile=privateProfile.profile;trips=trips.map(t=>({...t,startPin:account.startPin}));}
 const settings=check(await db.from('pilot_settings').select('*').single()) as Settings; const zones=check(await db.from('pilot_zones').select('*')) as Zone[];
 if(driver){const d=driver;offers=offers.filter(t=>!settings.paused&&d.online&&d.position_at&&Date.parse(d.position_at)>Date.now()-90000&&d.accuracy!==null&&d.accuracy<=150&&d.lat!==null&&d.lng!==null&&serviceable({lat:d.lat,lng:d.lng},zones)&&(d.approval==='approved'||d.approval==='test'&&settings.allow_skips)&&calculateHaversineDistanceKm(d.lat,d.lng,t.payload.pickup.lat,t.payload.pickup.lng)<=t.radius_km);}
 trips=trips.map(t=>account.role==='customer'&&['COMPLETED','CANCELLED','NO_DRIVERS'].includes(t.status)&&t.driver?{...t,driver:{...t.driver,lat:null,lng:null,position_at:null}}:t);
 return NextResponse.json({data:{account,driver,trips,offers,settings,zones,events:account.role==='admin'?check(await db.from('pilot_audit').select('*').order('created_at',{ascending:false}).limit(100)):[]}});
}

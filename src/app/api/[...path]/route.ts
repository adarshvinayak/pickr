import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminLogin, login, logout } from '@/lib/pilot/accounts';
import { adminAction, adminData } from '@/lib/pilot/admin';
import { createBooking, quoteRoute, tripAction } from '@/lib/pilot/bookings';
import { availability, onboard, offer, position } from '@/lib/pilot/drivers';
import { snapshot } from '@/lib/pilot/snapshot';
import { fileUrl, upload } from '@/lib/pilot/uploads';
import { ApiError, check, database, failure, identity, json, PointSchema } from '@/lib/pilot/server';
import { geocodeAddress, reverseGeocode, mapPublicKey } from '@/lib/mappls';
import { navigationRefresh,refreshRoutes,roadReports } from '@/lib/pilot/navigation';
import { MATERIALS } from '@/config/materials';
import { VEHICLE_TYPES } from '@/config/vehicles';
import { parseVoiceTranscript } from '@/lib/voice-parser';
import { flushPush } from '@/lib/pilot/push';
import { allowedRequestOrigin } from '@/lib/pilot/origin';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function allowedOrigin(req:NextRequest):boolean { return allowedRequestOrigin(req.headers.get('origin'),req.nextUrl.origin,req.headers.get('host'),process.env.PUBLIC_APP_URL); }
async function handle(req:NextRequest):Promise<NextResponse> {
 let response:NextResponse;
 try {
 if(!allowedOrigin(req))throw new ApiError(403,'Origin is not allowed.');
 const path=req.nextUrl.pathname.replace(/^\/api\//,'');const method=req.method;
 if(method==='OPTIONS') response=new NextResponse(null,{status:204});
 else if(path==='release'&&method==='GET')response=NextResponse.json({data:{release:process.env.NEXT_PUBLIC_PICKR_RELEASE}});
 else if(path==='login'&&method==='POST')response=await login(req);
 else if(path==='admin/login'&&method==='POST')response=await adminLogin(req);
 else if(path==='logout'&&method==='POST')response=await logout(req);
 else if(path==='snapshot'&&method==='GET')response=await snapshot(req);
 else if(path==='quote'&&method==='POST')response=await quoteRoute(req);
 else if(path==='bookings'&&method==='POST')response=await createBooking(req);
 else if(/^bookings\/[a-f0-9-]+\/action$/.test(path)&&method==='POST')response=await tripAction(req,path.split('/')[1]);
 else if(path==='driver/onboard'&&method==='POST')response=await onboard(req);
 else if(path==='driver/position'&&method==='POST')response=await position(req);
 else if(path==='driver/availability'&&method==='POST')response=await availability(req);
 else if(/^offers\/[a-f0-9-]+$/.test(path)&&method==='POST')response=await offer(req,path.split('/')[1]);
 else if(path==='upload'&&method==='POST')response=await upload(req);
 else if(path==='file'&&method==='GET')response=await fileUrl(req);
 else if(path==='admin'&&method==='GET')response=await adminData(req);
 else if(path==='admin'&&method==='POST')response=await adminAction(req);
 else if(path==='catalogue'&&method==='GET')response=NextResponse.json({data:{materials:MATERIALS,vehicles:VEHICLE_TYPES}});
 else if(path==='health'&&method==='GET') {check(await database().from('pilot_settings').select('id,require_device_area').single());check(await database().from('pilot_navigation').select('booking_id').limit(1));response=NextResponse.json({data:{databaseConnected:true,migrationsReady:true,mapsConfigured:Boolean(process.env.MAPPLS_REST_KEY&&process.env.MAPPLS_WEB_KEY),firebaseConfigured:Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)}});}
 else if(path==='reverse-geocode'&&method==='GET'){await identity(req);const lat=z.coerce.number().min(-90).max(90).parse(req.nextUrl.searchParams.get('lat'));const lng=z.coerce.number().min(-180).max(180).parse(req.nextUrl.searchParams.get('lng'));response=NextResponse.json({data:await reverseGeocode(lat,lng)});}
 else if(path==='geocode'&&method==='GET') {await identity(req);const query=z.string().min(3).max(200).parse(req.nextUrl.searchParams.get('q'));response=NextResponse.json({data:await geocodeAddress(query)});}
 else if(path==='map/config'&&method==='GET') {await identity(req);response=NextResponse.json({data:{key:mapPublicKey(),provider:'mappls'}});}
 else if(path==='road-reports'&&['GET','POST'].includes(method))response=await roadReports(req);
 else if(/^bookings\/[a-f0-9-]+\/navigation$/.test(path)&&method==='POST')response=await navigationRefresh(req,path.split('/')[1]);
 else if(path==='voice/parse'&&method==='POST') {await identity(req,['customer']);const input=z.object({transcript:z.string().min(1).max(2000),currentSlots:z.record(z.unknown()).optional()}).parse(await json(req));response=NextResponse.json({data:await parseVoiceTranscript(input)});}
 else if(path==='sites') {
 const account=await identity(req,['customer']);const db=database();
 if(method==='GET')response=NextResponse.json({data:check(await db.from('pilot_saved_sites').select('*').eq('owner_id',account.id))});
 else if(method==='POST')response=NextResponse.json({data:check(await db.from('pilot_saved_sites').insert({...PointSchema.parse(await json(req)),owner_id:account.id}).select('*').single())});
 else if(method==='DELETE') {const id=z.string().uuid().parse(req.nextUrl.searchParams.get('id'));check(await db.from('pilot_saved_sites').delete().eq('owner_id',account.id).eq('id',id));response=NextResponse.json({data:true});}else throw new ApiError(405,'Method not allowed.');
 }
 else if(path==='push/token'&&method==='POST') {const account=await identity(req);const {token}=z.object({token:z.string().min(20).max(1000)}).parse(await json(req));check(await database().from('pilot_push_tokens').upsert({token,owner_id:account.id,updated_at:new Date().toISOString()}));response=NextResponse.json({data:true});}
 else if(path==='worker'&&method==='POST') {const secret=process.env.WORKER_SECRET;if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)throw new ApiError(403,'Worker access denied.');check(await database().rpc('pilot_dispatch'));const routes=await refreshRoutes();let sent=0;let pushError=false;if(process.env.FIREBASE_SERVICE_ACCOUNT_JSON){try{sent=await flushPush();}catch{pushError=true;}}response=NextResponse.json({data:{sent,routes,pushError}});}
 else throw new ApiError(404,'Endpoint not found.');
 } catch(error) {response=failure(error);}
 if(allowedOrigin(req)) {response.headers.set('Access-Control-Allow-Origin',req.headers.get('origin')||req.nextUrl.origin);response.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');response.headers.set('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');response.headers.set('Vary','Origin');}
 if(!response.headers.has('Cache-Control'))response.headers.set('Cache-Control','no-store');return response;
}
export const GET=handle;export const POST=handle;export const DELETE=handle;export const OPTIONS=handle;

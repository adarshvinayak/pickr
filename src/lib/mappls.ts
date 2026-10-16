import { z } from 'zod';
import { ApiError } from '@/lib/pilot/server';
import { decodePolyline } from '@/lib/pilot/navigation-geo';
export const TruckSchema = z.object({height:z.number().min(.5).max(10),width:z.number().min(.5).max(6),length:z.number().min(1).max(30),weight:z.number().min(.2).max(100),axle_load:z.number().min(.1).max(30)});
export type TruckProfile = z.infer<typeof TruckSchema>;
export interface RouteResult {distanceKm:number;durationMin:number;durationSeconds:number;polyline:string;profile:'driving'|'trucking';trafficMode:'traffic'|'predictive'|'traffic_eta';restrictionsApplied:boolean;hasTimeRestrictions:boolean;instructions:string[]}
export interface GeocodeResult {id:string;label:string;address:string;lat:number;lng:number}
export function mapToken():string {const key=process.env.MAPPLS_REST_KEY;if(!key||/your-|replace-with/.test(key))throw new ApiError(503,'Mappls is not configured. Add MAPPLS_REST_KEY.');return key;}
export function mapPublicKey():string {const key=process.env.MAPPLS_WEB_KEY;if(!key||/your-|replace-with/.test(key))throw new ApiError(503,'Mappls web maps are not configured. Add MAPPLS_WEB_KEY.');return key;}
function coordinate(value:unknown):number {return typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;}
async function request(url:URL):Promise<unknown> {
 url.searchParams.set('access_token',mapToken());let response:Response;
 try{response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});}catch{throw new ApiError(502,'Mappls is unreachable. Check the connection and retry.');}
 if(response.status===204)return null;
 if(!response.ok)throw new ApiError(502,response.status===401||response.status===403?'Mappls access denied or quota reached. Check API entitlements and key restrictions.':'Mappls could not calculate this request. Retry or contact pilot support.');
 try{return await response.json();}catch{throw new ApiError(502,'Mappls returned an invalid response.');}
}
const Place=z.object({eLoc:z.string().optional(),eloc:z.string().optional(),formattedAddress:z.string().optional(),poi:z.string().optional(),latitude:z.union([z.number(),z.string()]).optional(),longitude:z.union([z.number(),z.string()]).optional()});
export async function geocodeAddress(query:string):Promise<GeocodeResult[]> {
 const url=new URL('https://search.mappls.com/search/address/geocode');url.search=new URLSearchParams({address:query,itemCount:'5',region:'IND'}).toString();
 const parsed=z.object({copResults:z.union([Place,z.array(Place)])}).safeParse(await request(url));if(!parsed.success)return [];
 const places=Array.isArray(parsed.data.copResults)?parsed.data.copResults:[parsed.data.copResults];
 return Promise.all(places.map(async(p)=>{
  const id=p.eLoc||p.eloc;if(!id||! /^[A-Za-z0-9]{6}$/.test(id))throw new ApiError(502,'Mappls returned an invalid place identifier.');
  let lat=coordinate(p.latitude),lng=coordinate(p.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)){
   const detail=z.object({latitude:z.union([z.number(),z.string()]),longitude:z.union([z.number(),z.string()])}).safeParse(await request(new URL(`https://place.mappls.com/O2O/entity/place-details/${id}`)));
   if(!detail.success)throw new ApiError(502,'Mappls Place Details needs Location Coordinates access. Choose the exact site on the map meanwhile.');
   lat=coordinate(detail.data.latitude);lng=coordinate(detail.data.longitude);
  }
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw new ApiError(502,'Coordinates unavailable. Choose the exact site on the map.');
  return {id,label:p.poi||p.formattedAddress||query,address:p.formattedAddress||query,lat,lng};
 }));
}
const Summary=z.object({length:z.number().nonnegative(),time:z.number().nonnegative(),has_time_restrictions:z.boolean().optional()});
const ResponseSchema=z.object({trip:z.object({status:z.number().optional(),summary:Summary,legs:z.array(z.object({shape:z.string().min(1),maneuvers:z.array(z.object({instruction:z.string()})).optional()})).min(1)})});
export function parseRoute(data:unknown,profile:'driving'|'trucking',mode:'traffic'|'predictive'):RouteResult {
 const parsed=ResponseSchema.safeParse(data);if(!parsed.success||parsed.data.trip.status&&parsed.data.trip.status!==0)throw new ApiError(422,'No suitable Mappls route was returned. Ask support to check the sites and truck restrictions.');
 const trip=parsed.data.trip;const coords=trip.legs.flatMap(leg=>decodePolyline(leg.shape));
 if(coords.length<2)throw new ApiError(502,'Mappls route geometry is unavailable.');
 return {distanceKm:Math.ceil(trip.summary.length*10)/10,durationMin:Math.max(1,Math.ceil(trip.summary.time/60)),durationSeconds:trip.summary.time,polyline:JSON.stringify(coords),profile,trafficMode:mode,restrictionsApplied:profile==='trucking',hasTimeRestrictions:trip.summary.has_time_restrictions||false,instructions:trip.legs.flatMap(l=>l.maneuvers?.map(m=>m.instruction)||[])};
}
const StandardRouteSchema=z.object({code:z.literal('Ok'),routes:z.array(z.object({distance:z.number().finite().nonnegative(),duration:z.number().finite().nonnegative(),geometry:z.object({type:z.literal('LineString'),coordinates:z.array(z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)])).min(2)}),legs:z.array(z.object({steps:z.array(z.object({maneuver:z.object({instruction:z.string().optional()}).optional()})).optional()})).optional()})).min(1)});
export function routingMode():'standard'|'predictive' {
 const mode=process.env.MAPPLS_ROUTING_MODE||'standard';
 if(mode!=='standard'&&mode!=='predictive')throw new ApiError(503,'MAPPLS_ROUTING_MODE must be standard or predictive.');
 return mode;
}
export function parseStandardRoute(data:unknown,profile:'driving'|'trucking'):RouteResult {
 const parsed=StandardRouteSchema.safeParse(data);
 if(!parsed.success)throw new ApiError(422,'No suitable Mappls route was returned. Choose accessible sites or contact pilot support.');
 const route=parsed.data.routes[0];
 return {distanceKm:Math.ceil(route.distance/100)/10,durationMin:Math.max(1,Math.ceil(route.duration/60)),durationSeconds:route.duration,polyline:JSON.stringify(route.geometry.coordinates),profile,trafficMode:'traffic_eta',restrictionsApplied:false,hasTimeRestrictions:false,instructions:route.legs?.flatMap(l=>l.steps?.flatMap(step=>step.maneuver?.instruction?[step.maneuver.instruction]:[])||[])||[]};
}
export async function calculateRoute(pickup:{lat:number;lng:number},drop:{lat:number;lng:number},options:{truck?:TruckProfile|null;scheduledFor?:string;avoid?:{lat:number;lng:number}[]}={}):Promise<RouteResult> {
 const truck=options.truck?TruckSchema.parse(options.truck):null;
 // Explicit pilot mode uses the allocated standard API. Never silently downgrade a denied predictive request.
 if(routingMode()==='standard'){
  const profile=truck?'trucking':'driving';
  const url=new URL(`https://route.mappls.com/route/direction/route_eta/${profile}/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}`);
  url.search=new URLSearchParams({geometries:'geojson',steps:'true'}).toString();
  // Standard ETA cannot predict a future departure or apply measured truck dimensions / incident avoidance.
  return parseStandardRoute(await request(url),profile);
 }
 const mode=options.scheduledFor&&Date.parse(options.scheduledFor)>Date.now()+60000?'predictive':'traffic';
 const url=new URL('https://route.mappls.com/routev2/direction/route');
 url.search=new URLSearchParams({locations:`${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}`,profile:truck?'trucking':'driving',speedTypes:mode,date_time:mode==='traffic'?'0,""':`1,${new Date(Date.parse(options.scheduledFor!)+330*60000).toISOString().slice(0,16)}`}).toString();
 if(truck){for(const [key,value] of Object.entries(truck))url.searchParams.set(key,String(value));url.searchParams.set('hazmat','false');}
 if(options.avoid?.length)url.searchParams.set('avoid_locations',JSON.stringify(options.avoid.slice(0,50).map(p=>({lat:p.lat,lon:p.lng}))));
 return parseRoute(await request(url),truck?'trucking':'driving',mode);
}

export async function reverseGeocode(lat:number,lng:number):Promise<GeocodeResult> {
 const url=new URL('https://search.mappls.com/search/address/rev-geocode');url.search=new URLSearchParams({lat:String(lat),lng:String(lng)}).toString();
 const parsed=z.object({results:z.array(z.object({formatted_address:z.string().optional(),street:z.string().optional(),locality:z.string().optional(),village:z.string().optional(),subLocality:z.string().optional(),subSubLocality:z.string().optional(),subDistrict:z.string().optional(),city:z.string().optional(),state:z.string().optional(),district:z.string().optional(),pincode:z.string().optional()}).passthrough())}).parse(await request(url));
 const p=parsed.results[0];if(!p)throw new ApiError(502,'Address unavailable for this pin.');
 return {id:`${lat},${lng}`,lat,lng,label:p.street||p.locality||p.village||p.district||'Selected site',address:[...new Set([p.street,p.subSubLocality,p.subLocality,p.locality,p.village,p.subDistrict,p.city,p.district,p.state,p.pincode?`PIN ${p.pincode}`:undefined].filter((v):v is string=>typeof v==='string'&&Boolean(v.trim())).map(v=>v.trim()))].join(', ')||'Area address unavailable for this pin'};
}

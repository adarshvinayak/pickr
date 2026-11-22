import { z } from 'zod';
import {TRUCK_MEASUREMENTS as bounds} from '@/config/truck-measurements';
import { ApiError } from '@/lib/pilot/server';
import { decodePolyline } from '@/lib/pilot/navigation-geo';
import { calculateHaversineDistanceKm } from '@/lib/pilot/geo';

/**
 * Google Maps Platform integration (server side): place search (Places API New),
 * address lookup (Geocoding API) and driving routes with live traffic (Routes API).
 * Browser maps use the separate, referrer-restricted web key (see maps-client.ts).
 *
 * Google's routing has no truck-dimension restrictions or "avoid this point" input,
 * so routes are general driving routes: `restrictionsApplied` is always false and the
 * driver must still check road signs and site access.
 */
export const TruckSchema = z.object({height:z.number().min(bounds.height.min).max(bounds.height.max),width:z.number().min(bounds.width.min).max(bounds.width.max),length:z.number().min(bounds.length.min).max(bounds.length.max),weight:z.number().min(bounds.weight.min).max(bounds.weight.max),axle_load:z.number().min(bounds.axle_load.min).max(bounds.axle_load.max)});
export type TruckProfile = z.infer<typeof TruckSchema>;
export interface RouteResult {distanceKm:number;durationMin:number;durationSeconds:number;polyline:string;profile:'driving'|'trucking';trafficMode:'traffic'|'predictive'|'traffic_eta';restrictionsApplied:boolean;hasTimeRestrictions:boolean;instructions:string[]}
export interface GeocodeResult {id:string;label:string;address:string;lat:number;lng:number}

/** Search results are biased (not limited) towards the pilot area. */
const BIAS={latitude:10.5276,longitude:76.2144,radius:50000};
const isPlaceholder=(key:string|undefined)=>!key||/your-|replace-with/.test(key);
export function mapToken():string {const key=process.env.GOOGLE_MAPS_SERVER_KEY;if(isPlaceholder(key))throw new ApiError(503,'Google Maps is not configured. Add GOOGLE_MAPS_SERVER_KEY.');return key!;}
export function mapPublicKey():string {const key=process.env.GOOGLE_MAPS_WEB_KEY;if(isPlaceholder(key))throw new ApiError(503,'Google web maps are not configured. Add GOOGLE_MAPS_WEB_KEY.');return key!;}

async function request(url:string,init:RequestInit&{fieldMask?:string}={}):Promise<unknown> {
 const {fieldMask,...rest}=init;let response:Response;
 // Read the key first so a missing key is reported as configuration, not as a network failure.
 const key=mapToken();
 try{response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000),...rest,headers:{'X-Goog-Api-Key':key,...(fieldMask?{'X-Goog-FieldMask':fieldMask}:{}),...(rest.headers||{})}});}catch{throw new ApiError(502,'Google Maps is unreachable. Check the connection and retry.');}
 if(!response.ok)throw new ApiError(502,response.status===401||response.status===403||response.status===429?'Google Maps access denied or quota reached. Check API enablement, billing and key restrictions.':'Google Maps could not calculate this request. Retry or contact pilot support.');
 try{return await response.json();}catch{throw new ApiError(502,'Google Maps returned an invalid response.');}
}

const SearchSchema=z.object({places:z.array(z.object({id:z.string().min(1),displayName:z.object({text:z.string()}).optional(),formattedAddress:z.string().optional(),location:z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)})})).optional()});
export async function geocodeAddress(query:string):Promise<GeocodeResult[]> {
 const data=await request('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'content-type':'application/json'},fieldMask:'places.id,places.displayName,places.formattedAddress,places.location',body:JSON.stringify({textQuery:query,regionCode:'IN',languageCode:'en',maxResultCount:5,locationBias:{circle:{center:{latitude:BIAS.latitude,longitude:BIAS.longitude},radius:BIAS.radius}}})});
 const parsed=SearchSchema.safeParse(data);if(!parsed.success)throw new ApiError(502,'Google Maps returned an unexpected search response.');
 return (parsed.data.places||[]).map(p=>({id:p.id,label:p.displayName?.text||p.formattedAddress||query,address:p.formattedAddress||p.displayName?.text||query,lat:p.location.latitude,lng:p.location.longitude}));
}

const Component=z.object({long_name:z.string(),types:z.array(z.string())});
const GeocodeResponse=z.object({status:z.string(),results:z.array(z.object({address_components:z.array(Component)})).optional()});
export function addressParts(components:z.infer<typeof Component>[]) {
 // Types are tried in priority order, so "sublocality_level_1" wins over the generic "sublocality" shared by deeper levels.
 const pick=(...types:string[])=>{for(const type of types){const found=components.find(c=>c.types.includes(type));if(found)return found.long_name;}return undefined;};
 return {sub2:pick('sublocality_level_2'),sub1:pick('sublocality_level_1','sublocality','neighborhood'),street:pick('route'),city:pick('locality'),district:pick('administrative_area_level_3','administrative_area_level_2'),state:pick('administrative_area_level_1'),pin:pick('postal_code')};
}
export async function reverseGeocode(lat:number,lng:number):Promise<GeocodeResult> {
 async function lookup(filtered:boolean){
  const url=new URL('https://maps.googleapis.com/maps/api/geocode/json');// The Geocoding API reads its key from the URL (unlike Places and Routes, which use a header).
  url.search=new URLSearchParams({latlng:`${lat},${lng}`,language:'en',region:'in',key:mapToken(),...(filtered?{result_type:'street_address|route|neighborhood|sublocality|locality'}:{})}).toString();
  const parsed=GeocodeResponse.safeParse(await request(url.toString()));if(!parsed.success)throw new ApiError(502,'Google Maps returned an unexpected address response.');
  if(['REQUEST_DENIED','OVER_QUERY_LIMIT','OVER_DAILY_LIMIT'].includes(parsed.data.status))throw new ApiError(502,'Google Maps access denied or quota reached. Check API enablement, billing and key restrictions.');
  return parsed.data.results?.[0];
 }
 const result=(await lookup(true))||(await lookup(false));
 if(!result)throw new ApiError(502,'Address unavailable for this pin.');
 // Neighbourhood and road only: never a house number, shop or business name.
 const p=addressParts(result.address_components);
 const label=[p.sub2||p.sub1,p.street||p.city||p.district].filter(Boolean).join(', ')||'Selected site';
 const address=[...new Set([p.sub2,p.sub1,p.street,p.city,p.district,p.state,p.pin?`PIN ${p.pin}`:undefined].filter((v):v is string=>Boolean(v&&v.trim())).map(v=>v.trim()))].join(', ')||'Area address unavailable for this pin';
 return {id:`${lat},${lng}`,lat,lng,label,address};
}

const RoutesResponse=z.object({routes:z.array(z.object({distanceMeters:z.number().finite().nonnegative().optional(),duration:z.string().regex(/^\d+(\.\d+)?s$/),polyline:z.object({encodedPolyline:z.string().min(2)}),legs:z.array(z.object({steps:z.array(z.object({navigationInstruction:z.object({instructions:z.string().optional()}).optional()})).optional()})).optional()})).min(1)});
const SAME_PLACE='Pickup and drop are the same place. Choose two different sites.';
export function parseRoute(data:unknown,mode:'traffic'|'predictive'):RouteResult {
 const parsed=RoutesResponse.safeParse(data);
 if(!parsed.success)throw new ApiError(422,'No suitable route was returned. Choose accessible sites or contact pilot support.');
 const route=parsed.data.routes[0];const seconds=Math.round(parseFloat(route.duration));
 let coords:[number,number][];try{coords=decodePolyline(route.polyline.encodedPolyline,5);}catch{throw new ApiError(502,'Route geometry is unavailable.');}
 // Google returns a single point when both ends snap to the same spot on the road.
 if(coords.length<2)throw new ApiError(422,SAME_PLACE);
 return {distanceKm:Math.ceil((route.distanceMeters||0)/100)/10,durationMin:Math.max(1,Math.ceil(seconds/60)),durationSeconds:seconds,polyline:JSON.stringify(coords),profile:'driving',trafficMode:mode,restrictionsApplied:false,hasTimeRestrictions:false,instructions:route.legs?.flatMap(l=>l.steps?.flatMap(s=>s.navigationInstruction?.instructions?[s.navigationInstruction.instructions]:[])||[])||[]};
}
export async function calculateRoute(pickup:{lat:number;lng:number},drop:{lat:number;lng:number},options:{truck?:TruckProfile|null;scheduledFor?:string;avoid?:{lat:number;lng:number}[]}={}):Promise<RouteResult> {
 // Validate the recorded vehicle profile even though Google cannot apply it, so bad data is still rejected.
 if(options.truck)TruckSchema.parse(options.truck);
 if(calculateHaversineDistanceKm(pickup.lat,pickup.lng,drop.lat,drop.lng)<0.03)throw new ApiError(422,SAME_PLACE);
 const future=Boolean(options.scheduledFor&&Date.parse(options.scheduledFor)>Date.now()+60000);
 const point=(p:{lat:number;lng:number})=>({location:{latLng:{latitude:p.lat,longitude:p.lng}}});
 const data=await request('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'content-type':'application/json'},fieldMask:'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction.instructions',body:JSON.stringify({origin:point(pickup),destination:point(drop),travelMode:'DRIVE',routingPreference:'TRAFFIC_AWARE',polylineEncoding:'ENCODED_POLYLINE',languageCode:'en-IN',units:'METRIC',...(future?{departureTime:new Date(options.scheduledFor!).toISOString()}:{})})});
 return parseRoute(data,future?'predictive':'traffic');
}

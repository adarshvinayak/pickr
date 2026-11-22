import {api,currentLocation} from './client';
import type {Point} from './model';

// A short-lived, in-memory fix avoids requesting GPS again between Home and Pickup.
let cached:{point:Point;at:number}|undefined;
let pending:Promise<Point>|undefined;
export function currentSite(force=false):Promise<Point>{
 if(!force&&cached&&Date.now()-cached.at<60_000)return Promise.resolve(cached.point);
 if(pending)return pending;
 pending=(async()=>{
  const location=await currentLocation();
  let point:Point={lat:location.lat,lng:location.lng,label:'Current location',address:'Address unavailable. Move the pin to your site entrance.'};
  try{point=await api<Point>(`reverse-geocode?lat=${location.lat}&lng=${location.lng}`);}catch{/* GPS remains useful when address lookup is unavailable. */}
  cached={point,at:Date.now()};return point;
 })().finally(()=>{pending=undefined;});
 return pending;
}

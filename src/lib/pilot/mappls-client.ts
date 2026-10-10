import { api } from './client';
interface MapEvent {lngLat?:{lat:number;lng:number};latlng?:{lat:number;lng:number}}
export interface MapInstance {addListener(name:string,callback:(event:MapEvent)=>void):void;remove():void;loaded():boolean;resize():void;setCenter(point:{lat:number;lng:number}):void;setZoom(zoom:number):void}
type Layer=object;
export interface MapplsSDK {
 Map:new(id:string,options:Record<string,unknown>)=>MapInstance;
 Marker:new(options:Record<string,unknown>)=>Layer;
 Polyline:new(options:Record<string,unknown>)=>Layer;
 Polygon:new(options:Record<string,unknown>)=>Layer;
 fitBounds:new(options:Record<string,unknown>)=>object;
 remove(options:{map:MapInstance;layer:Layer}):void;
}
declare global {interface Window {mappls?:MapplsSDK}}
let loading:Promise<MapplsSDK>|null=null;
export function loadMappls():Promise<MapplsSDK> {
 if(window.mappls)return Promise.resolve(window.mappls);
 if(loading)return loading;
 loading=(async()=>{
  const {key}=await api<{key:string}>('map/config');
  await new Promise<void>((resolve,reject)=>{
   const script=document.createElement('script');const timer=setTimeout(()=>{script.remove();reject(new Error('Mappls loading timed out. Check your internet connection.'));},20000);
   script.src=`https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${encodeURIComponent(key)}`;script.async=true;
   script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Mappls could not load. Check web key access, domain restrictions and connection.'));};document.head.append(script);
  });if(!window.mappls)throw new Error('Mappls SDK is unavailable.');return window.mappls;
 })().catch(error=>{loading=null;throw error;});return loading;
}

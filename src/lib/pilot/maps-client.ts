import { api } from './client';

/** Google Maps JavaScript API, loaded once per page with the referrer-restricted web key from the backend. */
export type GoogleMaps = typeof google.maps;
declare global {interface Window {gm_authFailure?:()=>void;__pickrMapsReady?:()=>void}}

const authListeners=new Set<()=>void>();
/** Google reports a rejected key (wrong referrer, API not enabled, billing off) only through this global hook. */
export function onMapAuthFailure(listener:()=>void):()=>void {authListeners.add(listener);return()=>{authListeners.delete(listener);};}

let loading:Promise<GoogleMaps>|null=null;
export function loadGoogleMaps():Promise<GoogleMaps> {
 if(window.google?.maps?.Map)return Promise.resolve(window.google.maps);
 if(loading)return loading;
 loading=(async()=>{
  const {key}=await api<{key:string}>('map/config');
  window.gm_authFailure=()=>authListeners.forEach(listener=>listener());
  await new Promise<void>((resolve,reject)=>{
   const script=document.createElement('script');const timer=setTimeout(()=>{script.remove();reject(new Error('Google Maps loading timed out. Check your internet connection.'));},20000);
   window.__pickrMapsReady=()=>{clearTimeout(timer);resolve();};
   script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&language=en&region=IN&callback=__pickrMapsReady`;script.async=true;
   script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Google Maps could not load. Check the web key, allowed websites and connection.'));};document.head.append(script);
  });
  if(!window.google?.maps?.Map)throw new Error('Google Maps is unavailable.');return window.google.maps;
 })().catch(error=>{loading=null;throw error;});return loading;
}

export interface HtmlMarkerOptions {map:google.maps.Map;position:{lat:number;lng:number};html:string;title?:string;anchor?:'bottom'|'center';onClick?:()=>void}
export interface HtmlMarker {setMap(map:google.maps.Map|null):void}
const classes=new WeakMap<GoogleMaps,new(options:HtmlMarkerOptions)=>HtmlMarker>();
/** A marker drawn from HTML (the app's icon font), without needing a Google Cloud Map ID. */
export function createHtmlMarker(g:GoogleMaps,options:HtmlMarkerOptions):HtmlMarker {
 let Marker=classes.get(g);
 if(!Marker){
  class Html extends g.OverlayView implements HtmlMarker {
   private element:HTMLDivElement|null=null;
   constructor(private readonly options:HtmlMarkerOptions){super();this.setMap(options.map);}
   onAdd():void{
    const element=document.createElement('div');element.style.position='absolute';element.style.cursor=this.options.onClick?'pointer':'default';element.innerHTML=this.options.html;
    if(this.options.title)element.title=this.options.title;
    const click=this.options.onClick;if(click)element.addEventListener('click',event=>{event.stopPropagation();click();});
    this.element=element;this.getPanes()?.overlayMouseTarget.appendChild(element);
   }
   draw():void{
    const point=this.getProjection()?.fromLatLngToDivPixel(new g.LatLng(this.options.position.lat,this.options.position.lng));
    if(!point||!this.element)return;
    this.element.style.left=`${point.x}px`;this.element.style.top=`${point.y}px`;
    this.element.style.transform=this.options.anchor==='center'?'translate(-50%,-50%)':'translate(-50%,-100%)';
   }
   onRemove():void{this.element?.remove();this.element=null;}
  }
  Marker=Html;classes.set(g,Html);
 }
 return new Marker(options);
}

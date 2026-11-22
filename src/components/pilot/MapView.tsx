'use client';
import { useEffect,useRef,useState } from 'react';
import { createHtmlMarker,type GoogleMaps,type HtmlMarker,loadGoogleMaps,onMapAuthFailure } from '@/lib/pilot/maps-client';
import {StitchIcon} from './StitchIcon';
import type { Point, Zone } from '@/lib/pilot/model';

type Layer={setMap(map:google.maps.Map|null):void};
const THRISSUR={lat:10.5276,lng:76.2144};
const AUTH_MESSAGE='Google Maps could not authorize this site. Check the web key, enabled APIs, billing and allowed websites.';

/**
 * Interactive Google map used for the booking picker, live tracking and the admin zone editor.
 * `centerPin` mode keeps a fixed pin in the middle and reports the point under it once the map rests.
 */
export function MapView({points=[],zones=[],line,onPick,height=300,editPoints=[],showInactiveZones=false,showHint=true,fitAllZones=false,centerPin=false,onMovingChange}:{points?:Array<Point&{kind?:string}>;zones?:Zone[];line?:string;onPick?:(point:Point)=>void;height?:number|string;editPoints?:[number,number][];showInactiveZones?:boolean;showHint?:boolean;fitAllZones?:boolean;centerPin?:boolean;onMovingChange?:(moving:boolean)=>void}) {
 const [attempt,setAttempt]=useState(0);const container=useRef<HTMLDivElement>(null);const map=useRef<google.maps.Map|null>(null);const maps=useRef<GoogleMaps|null>(null);const layers=useRef<Array<Layer|HtmlMarker>>([]);const info=useRef<google.maps.InfoWindow|null>(null);
 const pick=useRef(onPick);const movement=useRef(onMovingChange);
 useEffect(()=>{pick.current=onPick;movement.current=onMovingChange;});
 const [ready,setReady]=useState(false);const [error,setError]=useState('');const [warning,setWarning]=useState('');const fitted=useRef('unset');const lastPicked=useRef('');const centerKey=useRef('');
 useEffect(()=>{
  let cancelled=false;let timeout:ReturnType<typeof setTimeout>|undefined;let settle:ReturnType<typeof setTimeout>|undefined;let owned:google.maps.Map|null=null;let firstIdle=true;const host=container.current;
  setReady(false);setError('');setWarning('');
  const stopAuth=onMapAuthFailure(()=>{if(!cancelled)setError(AUTH_MESSAGE);});
  void loadGoogleMaps().then(g=>{
   if(cancelled||!host)return;
   const canvas=document.createElement('div');canvas.style.height='100%';host.replaceChildren(canvas);
   const m=new g.Map(canvas,{center:THRISSUR,zoom:12,zoomControl:true,fullscreenControl:false,streetViewControl:false,mapTypeControl:false,clickableIcons:false,gestureHandling:'greedy',rotateControl:false,tilt:0});
   new g.TrafficLayer().setMap(m);map.current=m;maps.current=g;owned=m;
   timeout=setTimeout(()=>{if(!cancelled&&firstIdle)setError('Google map has not loaded. Check map access and connection.');},20000);
   m.addListener('dragstart',()=>{clearTimeout(settle);if(!cancelled&&centerPin)movement.current?.(true);});
   m.addListener('idle',()=>{
    if(cancelled)return;
    if(firstIdle){firstIdle=false;clearTimeout(timeout);setReady(true);setError('');setWarning('');return;}
    if(!centerPin)return;
    clearTimeout(settle);
    settle=setTimeout(()=>{
     if(cancelled)return;const c=m.getCenter();if(!c)return;const p={lat:c.lat(),lng:c.lng()};const key=`${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
     if(key===lastPicked.current){movement.current?.(false);return;}
     lastPicked.current=key;centerKey.current=`${p.lat},${p.lng}`;pick.current?.({label:'Selected site',address:'Looking up address…',lat:p.lat,lng:p.lng});movement.current?.(false);
    },350);
   });
   m.addListener('click',(e:google.maps.MapMouseEvent)=>{if(cancelled||centerPin||!e.latLng)return;const p={lat:e.latLng.lat(),lng:e.latLng.lng()};pick.current?.({label:'Pinned location',address:`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`,lat:p.lat,lng:p.lng});});
  }).catch(e=>{if(!cancelled)setError((e as Error).message);});
  return()=>{
   cancelled=true;stopAuth();clearTimeout(timeout);clearTimeout(settle);lastPicked.current='';
   // Google has no destroy call: drop listeners and overlays, then empty the container.
   if(owned&&maps.current)maps.current.event.clearInstanceListeners(owned);
   layers.current.forEach(layer=>layer.setMap(null));layers.current=[];info.current?.close();info.current=null;
   if(map.current===owned){map.current=null;}host?.replaceChildren();
   fitted.current='unset';centerKey.current='';
  };
 },[attempt,centerPin]);
 const serialized=JSON.stringify({points:centerPin?points.map(({lat,lng})=>({lat,lng})):points,zones,line,editPoints,showInactiveZones,fitAllZones});
 useEffect(()=>{
  const {points,zones,line,editPoints,showInactiveZones,fitAllZones}=JSON.parse(serialized) as {points:Array<Point&{kind?:string}>;zones:Zone[];line?:string;editPoints:[number,number][];showInactiveZones:boolean;fitAllZones:boolean};
  const m=map.current,g=maps.current;if(!ready||!m||!g)return;
  layers.current.forEach(layer=>layer.setMap(null));layers.current=[];
  const add=(layer:Layer|HtmlMarker)=>layers.current.push(layer);
  const latLng=([lng,lat]:[number,number])=>({lat,lng});
  zones.filter(z=>z.active||showInactiveZones).forEach(z=>add(new g.Polygon({map:m,paths:z.polygon.map(latLng),strokeColor:z.active?'#B44718':'#68736E',strokeWeight:2,fillColor:z.active?'#B44718':'#68736E',fillOpacity:z.active?.05:.025,clickable:false})));
  if(line){try{const coords=JSON.parse(line) as [number,number][];add(new g.Polyline({map:m,path:coords.map(latLng),strokeColor:'#b44718',strokeWeight:5,clickable:false}));}catch{/* Never draw an invented route. */}}
  if(editPoints.length>=3)add(new g.Polygon({map:m,paths:editPoints.map(latLng),strokeColor:'#b44718',fillColor:'#b44718',fillOpacity:.12,clickable:false}));
  points.filter(()=>!centerPin).forEach(p=>{
   const isDriver=Boolean(p.kind?.startsWith('driver'));const icon=isDriver?'local_shipping':p.kind==='incident'?'warning':'pin_drop';
   add(createHtmlMarker(g,{map:m,position:{lat:p.lat,lng:p.lng},anchor:isDriver?'center':'bottom',title:p.label,html:`<span class="pickr-map-marker material-symbols-outlined ${isDriver?p.kind:''} ${p.kind==='drop'?'map-drop':''}" aria-label="${isDriver?'Driver':'Site'}">${icon}</span>`,onClick:()=>{info.current?.close();const text=document.createElement('span');text.textContent=p.label;info.current=new g.InfoWindow({content:text,position:{lat:p.lat,lng:p.lng},pixelOffset:new g.Size(0,-34)});info.current.open({map:m});}}));
  });
  const sites=points.filter(p=>!p.kind?.startsWith('driver'));
  const shownZones=zones.filter(z=>z.active||showInactiveZones);
  const key=sites.length?sites.map(p=>`${p.lat},${p.lng}`).join('|'):points.length?'drivers':shownZones.map(z=>JSON.stringify(z.polygon)).join('|');
  // Coordinates are GeoJSON [longitude, latitude] pairs.
  const bounds:[number,number][]=points.length?points.map(p=>[p.lng,p.lat] as [number,number]):(fitAllZones?shownZones:shownZones.slice(0,1)).flatMap(z=>z.polygon);
  if(bounds.length&&fitted.current!==key&&(!centerPin||fitted.current==='unset'||key!==centerKey.current)){
   if(bounds.length===1){m.setCenter({lng:bounds[0][0],lat:bounds[0][1]});m.setZoom(15);}
   else{const box=new g.LatLngBounds();bounds.forEach(b=>box.extend({lng:b[0],lat:b[1]}));m.fitBounds(box,35);g.event.addListenerOnce(m,'idle',()=>{if((m.getZoom()||0)>15)m.setZoom(15);});}
   fitted.current=key;
  }
 },[ready,serialized,centerPin]);
 useEffect(()=>{const m=map.current,g=maps.current;const element=container.current;if(!ready||!m||!g||!element)return;const observer=new ResizeObserver(()=>{if(map.current===m)g.event.trigger(m,'resize');});observer.observe(element);return()=>observer.disconnect();},[ready,attempt]);
 // A percentage height (the full-screen embedded picker) must also size the wrapper, or Google gets a 0px-tall container and draws nothing.
 return <div className="pilot-map" style={typeof height==='string'?{height}:undefined}><div ref={container} style={{height}} aria-label="Interactive Google road map"/>{centerPin&&ready&&!error&&<span className="map-center-pin" aria-hidden="true"><StitchIcon name="pin_drop" className="fill"/></span>}{!ready&&!error&&<p className="hint">Loading Google Maps…</p>}{(error||warning)&&<div className="stack notice" role="status"><p>{error||warning}</p><button className="secondary" onClick={()=>setAttempt(a=>a+1)}>Retry map</button></div>}<p className="hint" hidden={!showHint}>Google Maps · Live traffic ETA appears in your trip details when available.{onPick?(centerPin?' Move the map under the pin to select the site entrance.':' Tap the map to select the exact site entrance.'):''}</p></div>;
}

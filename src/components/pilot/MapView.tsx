'use client';
import { useEffect,useRef,useState,useId } from 'react';
import { loadMappls,type MapInstance } from '@/lib/pilot/mappls-client';
import type { Point, Zone } from '@/lib/pilot/model';
export function MapView({points=[],zones=[],line,onPick,height=300,editPoints=[],showInactiveZones=false,showHint=true,fitAllZones=false}:{points?:Array<Point&{kind?:string}>;zones?:Zone[];line?:string;onPick?:(point:Point)=>void;height?:number;editPoints?:[number,number][];showInactiveZones?:boolean;showHint?:boolean;fitAllZones?:boolean}) {
 const id=`pickr-map-${useId().replace(/[^a-zA-Z0-9]/g,'')}`;const map=useRef<MapInstance|null>(null);const layers=useRef<object[]>([]);const pick=useRef(onPick);pick.current=onPick;
 const [ready,setReady]=useState(false);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);const fitted=useRef('unset');
 useEffect(()=>{let cancelled=false;let timeout:ReturnType<typeof setTimeout>|undefined;setReady(false);setError('');
 void loadMappls().then(sdk=>{
  if(cancelled)return;const m=new sdk.Map(id,{center:{lat:10.5276,lng:76.2144},zoom:12,zoomControl:true,traffic:true,fullscreenControl:false,tilt:0});map.current=m;
  const loaded=()=>{if(!cancelled){clearTimeout(timeout);setReady(true);setError('');}};
  m.addListener('load',loaded);if(m.loaded())loaded();
  timeout=setTimeout(()=>{if(!cancelled&&!m.loaded())setError('Mappls map has not loaded. Check map access and connection.');},20000);
  m.addListener('error',()=>{if(!cancelled)setError('Some Mappls resources are unavailable. Route estimates may still be shown; retry the map.');});
  m.addListener('click',e=>{const p=e.lngLat||e.latlng;if(p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng))pick.current?.({label:'Pinned location',address:`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`,lat:p.lat,lng:p.lng});});
 }).catch(e=>{if(!cancelled)setError((e as Error).message);});
 return()=>{cancelled=true;clearTimeout(timeout);map.current?.remove();map.current=null;layers.current=[];fitted.current='unset';};},[id,attempt]);
 const serialized=JSON.stringify({points,zones,line,editPoints,showInactiveZones,fitAllZones});
 useEffect(()=>{
  const {points,zones,line,editPoints,showInactiveZones,fitAllZones}=JSON.parse(serialized) as {points:Array<Point&{kind?:string}>;zones:Zone[];line?:string;editPoints:[number,number][];showInactiveZones:boolean;fitAllZones:boolean};
  const m=map.current,sdk=window.mappls;if(!ready||!m||!sdk)return;
  layers.current.forEach(layer=>sdk.remove({map:m,layer}));layers.current=[];
  const add=(layer:object)=>layers.current.push(layer);
  zones.filter(z=>z.active||showInactiveZones).forEach(z=>add(new sdk.Polygon({map:m,paths:z.polygon.map(([lng,lat])=>({lat,lng})),strokeColor:z.active?'#B44718':'#68736E',strokeWeight:2,fillColor:z.active?'#B44718':'#68736E',fillOpacity:z.active?.05:.025,fitbounds:false})));
  if(line){try{const coords=JSON.parse(line) as [number,number][];add(new sdk.Polyline({map:m,paths:coords.map(([lng,lat])=>({lat,lng})),strokeColor:'#b44718',strokeWeight:5,fitbounds:false}));}catch{/* Never draw an invented route. */}}
  if(editPoints.length>=3)add(new sdk.Polygon({map:m,paths:editPoints.map(([lng,lat])=>({lat,lng})),strokeColor:'#b44718',fillColor:'#b44718',fillOpacity:.12,fitbounds:false}));
  points.forEach(p=>{
   const label=document.createElement('span');label.textContent=p.label;
   const isDriver=p.kind?.startsWith('driver');const dot=isDriver?'local_shipping':p.kind==='incident'?'warning':'pin_drop';
   add(new sdk.Marker({map:m,position:{lat:p.lat,lng:p.lng},html:`<span class="pickr-map-marker material-symbols-outlined ${isDriver?p.kind:''} ${p.kind==='drop'?'map-drop':''}" aria-label="${isDriver?'Driver':'Site'}">${dot}</span>`,popupHtml:label.outerHTML,fitbounds:false}));
  });
  const sites=points.filter(p=>!p.kind?.startsWith('driver'));
  const shownZones=zones.filter(z=>z.active||showInactiveZones);
  const key=sites.length?sites.map(p=>`${p.lat},${p.lng}`).join('|'):points.length?'drivers':shownZones.map(z=>JSON.stringify(z.polygon)).join('|');
  const bounds=points.length?points.map(p=>[p.lng,p.lat]):(fitAllZones?shownZones:shownZones.slice(0,1)).flatMap(z=>z.polygon);
  // cType 1 preserves GeoJSON [longitude, latitude] order in the Mappls SDK.
  if(bounds.length&&fitted.current!==key){if(bounds.length===1){m.setCenter({lng:bounds[0][0],lat:bounds[0][1]});m.setZoom(15);}else new sdk.fitBounds({map:m,cType:1,bounds,options:{padding:35,maxZoom:15,duration:0}});fitted.current=key;}
  m.resize();
 },[ready,serialized]);
 return <div className="pilot-map"><div id={id} style={{height}} aria-label="Interactive Mappls road map"/>{!ready&&!error&&<p className="hint">Loading Mappls…</p>}{error&&<div className="stack notice"><p>{error}</p><button className="secondary" onClick={()=>setAttempt(a=>a+1)}>Retry map</button></div>}<p className="hint" hidden={!showHint}>Mappls · Live traffic ETA appears in your trip details when available.{onPick?' Tap the map to select the exact site entrance.':''}</p></div>;
}

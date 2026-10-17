'use client';
import { useEffect,useRef,useState,useId } from 'react';
import { loadMappls,type MapInstance } from '@/lib/pilot/mappls-client';
import {mapLifecycle} from '@/lib/pilot/map-lifecycle';
import {StitchIcon} from './StitchIcon';
import type { Point, Zone } from '@/lib/pilot/model';
export function MapView({points=[],zones=[],line,onPick,height=300,editPoints=[],showInactiveZones=false,showHint=true,fitAllZones=false,centerPin=false}:{points?:Array<Point&{kind?:string}>;zones?:Zone[];line?:string;onPick?:(point:Point)=>void;height?:number;editPoints?:[number,number][];showInactiveZones?:boolean;showHint?:boolean;fitAllZones?:boolean;centerPin?:boolean}) {
 const [attempt,setAttempt]=useState(0);const id=`pickr-map-${useId().replace(/[^a-zA-Z0-9]/g,'')}-${attempt}`;const map=useRef<MapInstance|null>(null);const layers=useRef<object[]>([]);const pick=useRef(onPick);pick.current=onPick;
 const [ready,setReady]=useState(false);const [error,setError]=useState('');const [warning,setWarning]=useState('');const lifecycle=useRef<ReturnType<typeof mapLifecycle>|null>(null);const fitted=useRef('unset');const lastPicked=useRef('');
 useEffect(()=>{let cancelled=false;let timeout:ReturnType<typeof setTimeout>|undefined;let settle:ReturnType<typeof setTimeout>|undefined;let resourceCheck:ReturnType<typeof setTimeout>|undefined;let owned:MapInstance|null=null;let life:ReturnType<typeof mapLifecycle>|null=null;setReady(false);setError('');setWarning('');
 void loadMappls().then(sdk=>{
  if(cancelled)return;const m=new sdk.Map(id,{center:{lat:10.5276,lng:76.2144},zoom:12,zoomControl:true,traffic:true,fullscreenControl:false,tilt:0});map.current=m;owned=m;
  const loaded=()=>{if(!cancelled){clearTimeout(timeout);setReady(true);setError('');setWarning('');}};
  life=mapLifecycle(m,loaded);lifecycle.current=life;
  timeout=setTimeout(()=>{if(!cancelled&&!m.loaded())setError('Mappls map has not loaded. Check map access and connection.');},20000);
  m.addListener('error',()=>{if(cancelled)return;clearTimeout(resourceCheck);resourceCheck=setTimeout(()=>{if(!cancelled&&!m.loaded())setWarning('Some map tiles or traffic details could not load. Check your connection or retry the map. Route estimates are separate.');},2500);});
  m.addListener('idle',()=>{if(!cancelled&&m.loaded()){clearTimeout(resourceCheck);setWarning('');}});
  m.addListener('movestart',()=>clearTimeout(settle));
  m.addListener('moveend',()=>{if(!centerPin)return;clearTimeout(settle);settle=setTimeout(()=>{if(cancelled||!life?.active())return;const p=m.getCenter();const key=`${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;if(key===lastPicked.current)return;lastPicked.current=key;centerKey.current=`${p.lat},${p.lng}`;pick.current?.({label:'Selected site',address:'Looking up address…',lat:p.lat,lng:p.lng});},350);});
  m.addListener('click',e=>{if(cancelled||!life?.active()||centerPin)return;const p=e.lngLat||e.latlng;if(p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng))pick.current?.({label:'Pinned location',address:`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`,lat:p.lat,lng:p.lng});});
 }).catch(e=>{if(!cancelled)setError((e as Error).message);});
 return()=>{cancelled=true;clearTimeout(timeout);clearTimeout(settle);clearTimeout(resourceCheck);lastPicked.current='';if(map.current===owned){map.current=null;lifecycle.current=null;}life?.dispose();layers.current=[];fitted.current='unset';centerKey.current='';};},[id,attempt,centerPin]);
 const centerKey=useRef('');
 const serialized=JSON.stringify({points:centerPin?points.map(({lat,lng})=>({lat,lng})):points,zones,line,editPoints,showInactiveZones,fitAllZones});
 useEffect(()=>{
  const {points,zones,line,editPoints,showInactiveZones,fitAllZones}=JSON.parse(serialized) as {points:Array<Point&{kind?:string}>;zones:Zone[];line?:string;editPoints:[number,number][];showInactiveZones:boolean;fitAllZones:boolean};
  const m=map.current,sdk=window.mappls;if(!ready||!m||!sdk||!lifecycle.current?.active())return;
  layers.current.forEach(layer=>{try{sdk.remove({map:m,layer});}catch{console.warn('Mappls could not remove a map layer.');}});layers.current=[];
  const add=(layer:object)=>layers.current.push(layer);
  zones.filter(z=>z.active||showInactiveZones).forEach(z=>add(new sdk.Polygon({map:m,paths:z.polygon.map(([lng,lat])=>({lat,lng})),strokeColor:z.active?'#B44718':'#68736E',strokeWeight:2,fillColor:z.active?'#B44718':'#68736E',fillOpacity:z.active?.05:.025,fitbounds:false})));
  if(line){try{const coords=JSON.parse(line) as [number,number][];add(new sdk.Polyline({map:m,paths:coords.map(([lng,lat])=>({lat,lng})),strokeColor:'#b44718',strokeWeight:5,fitbounds:false}));}catch{/* Never draw an invented route. */}}
  if(editPoints.length>=3)add(new sdk.Polygon({map:m,paths:editPoints.map(([lng,lat])=>({lat,lng})),strokeColor:'#b44718',fillColor:'#b44718',fillOpacity:.12,fitbounds:false}));
  points.filter(()=>!centerPin).forEach(p=>{
   const label=document.createElement('span');label.textContent=p.label;
   const isDriver=p.kind?.startsWith('driver');const dot=isDriver?'local_shipping':p.kind==='incident'?'warning':'pin_drop';
   add(new sdk.Marker({map:m,position:{lat:p.lat,lng:p.lng},html:`<span class="pickr-map-marker material-symbols-outlined ${isDriver?p.kind:''} ${p.kind==='drop'?'map-drop':''}" aria-label="${isDriver?'Driver':'Site'}">${dot}</span>`,popupHtml:label.outerHTML,fitbounds:false}));
  });
  const sites=points.filter(p=>!p.kind?.startsWith('driver'));
  const shownZones=zones.filter(z=>z.active||showInactiveZones);
  const key=sites.length?sites.map(p=>`${p.lat},${p.lng}`).join('|'):points.length?'drivers':shownZones.map(z=>JSON.stringify(z.polygon)).join('|');
  const bounds=points.length?points.map(p=>[p.lng,p.lat]):(fitAllZones?shownZones:shownZones.slice(0,1)).flatMap(z=>z.polygon);
  // cType 1 preserves GeoJSON [longitude, latitude] order in the Mappls SDK.
  if(bounds.length&&fitted.current!==key&&(!centerPin||fitted.current==='unset'||key!==centerKey.current)){if(bounds.length===1){m.setCenter({lng:bounds[0][0],lat:bounds[0][1]});m.setZoom(15);}else new sdk.fitBounds({map:m,cType:1,bounds,options:{padding:35,maxZoom:15,duration:0}});fitted.current=key;}

 },[ready,serialized,centerPin]);
 useEffect(()=>{const m=map.current;const element=document.getElementById(id);if(!ready||!m||!element)return;const observer=new ResizeObserver(()=>{if(map.current===m&&lifecycle.current?.active())m.resize();});observer.observe(element);return()=>observer.disconnect();},[ready,id]);
 return <div className="pilot-map"><div key={id} id={id} style={{height}} aria-label="Interactive Mappls road map"/>{centerPin&&ready&&!error&&<span className="map-center-pin" aria-hidden="true"><StitchIcon name="pin_drop" className="fill"/></span>}{!ready&&!error&&<p className="hint">Loading Mappls…</p>}{(error||warning)&&<div className="stack notice" role="status"><p>{error||warning}</p><button className="secondary" onClick={()=>setAttempt(a=>a+1)}>Retry map</button></div>}<p className="hint" hidden={!showHint}>Mappls · Live traffic ETA appears in your trip details when available.{onPick?(centerPin?' Move the map under the pin to select the site entrance.':' Tap the map to select the exact site entrance.'):''}</p></div>;
}

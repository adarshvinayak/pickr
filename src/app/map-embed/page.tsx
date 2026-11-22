'use client';
import {useEffect,useState} from 'react';
import {MapView} from '@/components/pilot/MapView';
import type {Point,Zone} from '@/lib/pilot/model';
type Config={token:string;centerPin?:boolean;points:(Point&{kind?:string})[];zones:Zone[];line?:string};
export default function EmbeddedMap(){const [authenticated,setAuthenticated]=useState(false);const [config,setConfig]=useState<Config|null>(null);useEffect(()=>{const receive=(e:MessageEvent)=>{if(e.source!==window.parent&&window.parent!==window)return;try{const d=typeof e.data==='string'?JSON.parse(e.data):e.data;if(d?.type==='pickr-map'){setConfig(d.config);}}catch{}};window.addEventListener('message',receive);(window as unknown as {pickrMapConfigure:(c:Config)=>void}).pickrMapConfigure=setConfig;send({type:'ready'});return()=>window.removeEventListener('message',receive);},[]);
useEffect(()=>{if(!config)return;const original=window.fetch;window.fetch=(input,init)=>{const path=String(input);if(path.startsWith('/api/'))return original(input,{...init,headers:{...init?.headers,Authorization:`Bearer ${config.token}`}});return original(input,init);};setAuthenticated(true);return()=>{window.fetch=original;};},[config]);
function send(data:unknown){const value=JSON.stringify(data);const native=(window as unknown as {ReactNativeWebView?:{postMessage:(v:string)=>void}}).ReactNativeWebView;if(native)native.postMessage(value);else window.parent.postMessage(data,window.location.origin);}
return config&&authenticated?<main style={{position:'fixed',inset:0}}><MapView height="100%" points={config.points} zones={config.zones} centerPin={config.centerPin} line={config.line} onMovingChange={moving=>send({type:'moving',moving})} onPick={point=>send({type:'point',point})} showHint={false}/></main>:<p>Loading map…</p>;}

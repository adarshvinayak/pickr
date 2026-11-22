import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
export const BACKEND=process.env.EXPO_PUBLIC_BACKEND_URL||(Platform.OS==='web'?'':'https://pickr-xueh.onrender.com');
let sessionToken='';export const getToken=()=>sessionToken;
export async function setToken(value:string){sessionToken=value;if(value)await AsyncStorage.setItem('pickr.api-session',value);else await AsyncStorage.removeItem('pickr.api-session');}
export async function restoreToken(){sessionToken=await AsyncStorage.getItem('pickr.api-session')||'';return sessionToken;}
export async function api<T=any>(path:string,body?:unknown,method?:string):Promise<T>{
 const form=body instanceof FormData;const r=await fetch(`${BACKEND}/api/${path}`,{method:method||(body?'POST':'GET'),headers:{...(sessionToken?{Authorization:`Bearer ${sessionToken}`}:{ }),...(!form&&body?{'Content-Type':'application/json'}:{})},body:body?form?body:JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
 const value=await r.json();if(!r.ok)throw new Error(value.error||'Unable to complete request. Try again.');return value.data;
}
export async function upload(uri:string,purpose:'pass'|'profile'){
 const form=new FormData();if(Platform.OS==='web'){const blob=await(await fetch(uri)).blob();form.append('file',blob,'photo.jpg');}else form.append('file',{uri,name:'photo.jpg',type:'image/jpeg'} as any);form.append('purpose',purpose);return (await api<{path:string}>('upload',form)).path;
}
let snapshot:any=null;const listeners=new Set<()=>void>();export const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};export const getSnapshot=()=>snapshot;
let sequence=0;let inflight:Promise<any>|null=null;
export async function refreshSnapshot(){if(inflight)return inflight;const n=++sequence;inflight=api('snapshot').then(value=>{if(n===sequence){snapshot=value;listeners.forEach(fn=>fn());}return value;}).finally(()=>{inflight=null;});return inflight;}
export function clearSnapshot(){++sequence;inflight=null;snapshot=null;listeners.forEach(fn=>fn());}
export const itemIds:Record<string,string>={'m-sand':'m_sand','p-sand':'p_sand','river-sand':'river_sand','jelly-10':'jelly_10','jelly-20':'jelly_20','jelly-40':'jelly_40','red-bricks':'bricks','hollow-blocks':'hollow_blocks',soil:'mud',debris:'debris',cement:'cement',steel:'steel',tiles:'tiles',pipes:'pipes',wood:'wood',mixed:'mixed'};
export const vehicleIds:Record<string,string>={'pickup-auto':'pickup_auto','tata-ace':'tata_ace',bolero:'pickup_1t','lorry-14':'lcv_14ft','lorry-17':'container_17ft','tipper-1':'tipper_100','tipper-2':'tipper_200',taurus:'taurus_700'};
export const reverseId=(map:Record<string,string>,id:string)=>Object.keys(map).find(k=>map[k]===id)||id;

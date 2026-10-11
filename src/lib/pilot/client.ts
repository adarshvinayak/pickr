import { compressPhoto } from './images';
import type { Role } from './model';
interface NativeBridge { getRole(): string; getBackendUrl(): string; setBackendUrl(url:string):void; startDriver(token:string,url:string):void; stopDriver():void; requestOverlay():void; requestNotifications():void; speak(text:string):void; listen(language:string):void; stopListening():void; configurePush(token:string,url:string):void; openExternal(url:string):void; printReceipt():void }
declare global { interface Window { PickrNative?:NativeBridge } }
export class ClientApiError extends Error {constructor(message:string,public status:number){super(message);this.name='ClientApiError';}}
let role:Role='customer';
export function useRole(value:Role):void {role=value;}
export function token():string {return typeof window==='undefined'?'':localStorage.getItem(`pickr-${role}-token`)||'';}
export function setToken(value:string):void {localStorage.setItem(`pickr-${role}-token`,value);}
export function apiBase():string {return typeof window==='undefined'?'':window.PickrNative?.getBackendUrl()||'';}
export async function api<T>(path:string,body?:unknown,method?:string):Promise<T> {
 const form=body instanceof FormData;
 let response:Response;
 try{response=await fetch(`${apiBase()}/api/${path}`,{method:method||(body?'POST':'GET'),cache:'no-store',headers:{...(token()?{Authorization:`Bearer ${token()}`} :{}),...(!form&&body?{'Content-Type':'application/json'}:{})},body:body?form?body:JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});}catch{throw new Error('Cannot reach the server. Check your connection and backend URL.');}
 const content=await response.json().catch(()=>({error:'Server returned an invalid response.'}));
 if(!response.ok)throw new ClientApiError(content.error||`Request failed (${response.status}).`,response.status);return content.data as T;
}
export async function uploadFile(file:File,purpose:'load'|'document'):Promise<string> {const form=new FormData();form.set('file',purpose==='load'?await compressPhoto(file):file);form.set('purpose',purpose);return (await api<{path:string}>('upload',form)).path;}
export function currentLocation():Promise<{lat:number;lng:number;accuracy:number;sampledAt:string}> {return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,sampledAt:new Date(p.timestamp).toISOString()}),e=>reject(new Error(e.message||'Enable precise location in device settings.')),{enableHighAccuracy:true,timeout:20000,maximumAge:0}));}
export function external(url:string):void {if(window.PickrNative)window.PickrNative.openExternal(url);else window.open(url,'_blank','noopener,noreferrer');}
export function say(text:string):void {if(window.PickrNative)window.PickrNative.speak(text);else if('speechSynthesis' in window){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.onend=()=>window.dispatchEvent(new Event('pickr-tts-end'));speechSynthesis.speak(utterance);}}

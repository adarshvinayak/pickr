import {createContext,useContext,useEffect,useState,type PropsWithChildren} from 'react';
import {Alert} from 'react-native';
import {api,getSnapshot} from './api';
import type {Site} from './booking';
export type SavedSite=Site&{id:string;uses:number;lastUsed:string;pinned:boolean;name?:string};
const SitesContext=createContext<any>(null);
export function SitesProvider({children}:PropsWithChildren){const [sites,setSites]=useState<SavedSite[]>([]);const load=async()=>{if(!getSnapshot()){setSites([]);return;}const result=await api<any[]>('sites');setSites(result.map(s=>({id:s.id,label:s.address||s.label,name:s.label,source:'saved',coords:{latitude:s.lat,longitude:s.lng},pinned:s.pinned,uses:s.uses,lastUsed:''})));};useEffect(()=>{void Promise.resolve().then(load).catch(()=>{});},[getSnapshot()?.account.id]);
const mutate=async(fn:()=>Promise<unknown>)=>{try{await fn();await load();}catch(e){Alert.alert('Could not save site',(e as Error).message);}};
const body=(s:Partial<SavedSite>)=>{if(!s.coords)throw new Error('Select this site on the map to save its exact location.');return{id:s.id,label:s.name||s.label,address:s.label,lat:s.coords.latitude,lng:s.coords.longitude,pinned:s.pinned??true,uses:s.uses||0};};
const value={favourites:[...sites].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.uses-a.uses),recordUse:(_s:Site[])=>{void load();},addSite:(s:any)=>void mutate(()=>api('sites',body(s))),editSite:(id:string,patch:any)=>void mutate(()=>api('sites',body({...sites.find(s=>s.id===id),...patch}))),removeSite:(id:string)=>void mutate(()=>api('sites?id='+id,undefined,'DELETE')),togglePin:(id:string)=>void mutate(()=>{const s=sites.find(s=>s.id===id)!;return api('sites',body({...s,pinned:!s.pinned}));})};return <SitesContext.Provider value={value}>{children}</SitesContext.Provider>;}
export function useSites(){return useContext(SitesContext) as {favourites:SavedSite[];recordUse:(s:Site[])=>void;addSite:(s:any)=>void;editSite:(id:string,p:any)=>void;removeSite:(id:string)=>void;togglePin:(id:string)=>void};}
export const asSite=(s:SavedSite):Site=>({label:s.label,source:'saved',coords:s.coords});

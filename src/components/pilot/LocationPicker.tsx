'use client';
import { useEffect,useState } from 'react';
import type { Point,Zone } from '@/lib/pilot/model';
import { api,currentLocation } from '@/lib/pilot/client';
import { MapView } from './MapView';
export function LocationPicker({label,value,onChange,zones}:{label:string;value:Point|null;onChange:(point:Point)=>void;zones:Zone[]}) {
 const [query,setQuery]=useState('');const [results,setResults]=useState<Point[]>([]);const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [saved,setSaved]=useState<(Point&{id:string})[]>([]);
 useEffect(()=>{api<(Point&{id:string})[]>('sites').then(setSaved).catch(()=>{});},[]);
 async function search(){setBusy(true);setError('');try{setResults(await api<Point[]>(`geocode?q=${encodeURIComponent(query)}`));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function locate(){setBusy(true);setError('');try{const p=await currentLocation();onChange({...p,label:'Current location',address:`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`});setOpen(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function save(){if(!value)return;try{const item=await api<Point&{id:string}>('sites',value);setSaved(s=>[...s,item]);}catch(e){setError((e as Error).message);}}
 return <section className="location-picker"><label>{label}</label>{value&&<div className="location-value"><strong>{value.label}</strong><small>{value.address}</small></div>}
 <div className="row"><input aria-label={`Search ${label}`} placeholder="Search town, site or address" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search();}}}/><button type="button" className="secondary" disabled={query.length<3||busy} onClick={search}>Search</button></div>
 <div className="row"><button type="button" className="secondary" onClick={locate} disabled={busy}>My location</button><button type="button" className="secondary" onClick={()=>setOpen(!open)}>Choose on map</button></div>
 {results.map((p,i)=><button type="button" className="result" key={i} onClick={()=>{onChange(p);setResults([]);setOpen(true);}}><strong>{p.label}</strong><small>{p.address}</small></button>)}
 {!!saved.length&&<select aria-label={`Saved ${label}`} value="" onChange={e=>{const p=saved.find(s=>s.id===e.target.value);if(p)onChange(p);}}><option value="">Choose a saved site</option>{saved.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>}
 {open&&<><MapView points={value?[value]:[]} zones={zones} onPick={onChange} height={240}/>{value&&<div className="row"><input aria-label="Site name" value={value.label} onChange={e=>onChange({...value,label:e.target.value})}/><button type="button" className="secondary" onClick={save}>Save site</button></div>}</>}
 {error&&<p role="alert" className="error">{error}</p>}</section>;
}

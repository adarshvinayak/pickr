'use client';
import { useEffect,useState } from 'react';
import { MATERIALS,getMaterialById } from '@/config/materials';
import { VehicleIcon } from '@/components/icons/VehicleIcon';
import type { Point,QuoteResult,Trip,Zone,VoiceResult } from '@/lib/pilot/model';
import { api,currentLocation } from '@/lib/pilot/client';
import { serviceable } from '@/lib/pilot/geo';
import { LocationPicker } from './LocationPicker';
import { VoiceIntake } from './VoiceIntake';
export const money=(amount:number):string=>`₹${amount.toLocaleString('en-IN')}`;
export function Fare({quote}:{quote:QuoteResult['options'][number]['quote']}) {return <div className="fare">{[['Base fare',quote.baseFare],['Distance charge',quote.distanceFare],['Loading helpers',quote.labourFare],['Waiting',quote.waitingFare],['Time adjustment',quote.subtotalAfterSurge-quote.subtotalBeforeSurge],['Platform fee',quote.platformFee],['GST',quote.gst]].map(([name,value])=><div key={name}><span>{name}</span><span>{money(Number(value))}</span></div>)}<div className="total"><strong>Total freight</strong><strong>{money(quote.totalFare)}</strong></div><small>Material cost is excluded. Final waiting charges depend on actual loading and unloading time.</small></div>;}
export function BookingForm({zones,onBooked,voiceInitially=false,requireDeviceArea=true}:{requireDeviceArea?:boolean;zones:Zone[];onBooked:(trip:Trip)=>void;voiceInitially?:boolean}) {
 const [materialId,setMaterial]=useState('m_sand');const [quantity,setQuantity]=useState(1);const [pickup,setPickup]=useState<Point|null>(null);const [drop,setDrop]=useState<Point|null>(null);const [labourNeeded,setLabour]=useState(false);const [siteAccess,setAccess]=useState<'normal'|'narrow'>('normal');const [scheduledFor,setSchedule]=useState('');const [notes,setNotes]=useState('');const [transitPassNo,setPass]=useState('');const [voice,setVoice]=useState(voiceInitially);const [mode,setMode]=useState<'manual'|'voice'>(voiceInitially?'voice':'manual');const [quoted,setQuote]=useState<QuoteResult|null>(null);const [vehicleTypeId,setVehicle]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [requestKey,setKey]=useState(()=>crypto.randomUUID());
 const [deviceLocation,setDevice]=useState<{lat:number;lng:number;sampledAt:string}|undefined>();
 const material=getMaterialById(materialId)!;
 useEffect(()=>{setQuote(null);setKey(crypto.randomUUID());},[materialId,quantity,pickup,drop,labourNeeded,siteAccess,scheduledFor,notes,transitPassNo,mode]);
 const intake={materialId,quantity,pickup,drop,labourNeeded:material.selfTipping?false:labourNeeded,siteAccess,scheduledFor:scheduledFor?new Date(scheduledFor).toISOString():undefined,notes,transitPassNo,inputMode:mode,deviceLocation};
 async function calculate(){if(!pickup||!drop){setError('Choose exact pickup and delivery locations.');return;}setBusy(true);setError('');try{const device=requireDeviceArea?await currentLocation():undefined;setDevice(device);const result=await api<QuoteResult>('quote',{...intake,deviceLocation:device});setQuote(result);setVehicle(result.recommendedId);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function book(){if(!quoted)return;setBusy(true);setError('');try{onBooked(await api<Trip>('bookings',{...intake,vehicleTypeId,quoteToken:quoted.quoteToken,requestKey}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function voiceDone(slots:VoiceResult){if(slots.material){setMaterial(slots.material);setQuantity(slots.quantity||getMaterialById(slots.material)!.minQuantity);}setLabour(slots.labourNeeded||false);setAccess(slots.siteAccess||'normal');if(slots.when&&slots.when!=='now')setSchedule(new Date(Date.parse(slots.when)-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16));setMode('voice');setVoice(false);}
 const selected=quoted?.options.find(o=>o.vehicle.id===vehicleTypeId);
 return <div className="stack"><div className="row"><h2>Book a truck</h2><button className="secondary" onClick={()=>setVoice(!voice)}>Voice booking</button></div>
 {voice&&<VoiceIntake onDone={voiceDone} onPickup={setPickup} onDrop={setDrop} pickup={pickup} drop={drop} zones={zones}/>}
 <label>Material<select value={materialId} onChange={e=>{setMaterial(e.target.value);setQuantity(getMaterialById(e.target.value)!.minQuantity);}}>{MATERIALS.map(m=><option key={m.id} value={m.id}>{m.displayName}</option>)}</select></label>
 <label>Quantity ({material.nativeUnit==='unit'?'units · 100 CFT each':material.nativeUnit})<input type="number" min={material.minQuantity} step="any" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
 <LocationPicker label="Pickup" value={pickup} onChange={setPickup} zones={zones}/><LocationPicker label="Destination" value={drop} onChange={setDrop} zones={zones}/>
 {(pickup&&!serviceable(pickup,zones)||drop&&!serviceable(drop,zones))&&<p className="error">This area is currently not serviceable. Choose pickup and destination inside the pilot boundary.</p>}
 <label>Pickup time<input type="datetime-local" value={scheduledFor} onChange={e=>setSchedule(e.target.value)}/><small>Leave blank for now. Later bookings begin searching at the selected time.</small></label>
 <label className="check"><input type="checkbox" checked={siteAccess==='narrow'} onChange={e=>setAccess(e.target.checked?'narrow':'normal')}/>Narrow access at either site</label>
 {!material.selfTipping&&<label className="check"><input type="checkbox" checked={labourNeeded} onChange={e=>setLabour(e.target.checked)}/>Loading and unloading helpers needed</label>}
 {material.needsTransitPass&&<label>Mineral transit pass number<input value={transitPassNo} onChange={e=>setPass(e.target.value)}/><small>Arrange a valid KOMPAS pass before transport.</small></label>}
 <label>Site instructions / contact / cargo dimensions<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Gate, loading access, long items or site contact" maxLength={1000}/></label>
 <button onClick={calculate} disabled={busy||!pickup||!drop||quantity<material.minQuantity}>{busy?'Please wait…':'Find suitable vehicles & get price'}</button>
 {quoted&&<section className="card stack"><p>{quoted.selection.explanation}</p><p>{quoted.route.distanceKm} km · approximately {quoted.route.durationMin} min · Mappls {quoted.route.trafficMode==='predictive'?'scheduled traffic':quoted.route.trafficMode==='traffic_eta'?'current traffic ETA on default route':'live traffic'} road estimate</p><small>{quoted.route.trafficMode==='traffic_eta'?'This quote uses current traffic, including for scheduled bookings. Measured truck restrictions and fastest traffic routing are unavailable; the driver must verify road and site access.':'This quote uses a general road route. Truck dimensions are checked after a driver is assigned; the driver must verify site access.'} Live route changes do not change the quoted distance fare.</small>
 {quoted.options.map(o=><button className={`vehicle-option ${vehicleTypeId===o.vehicle.id?'selected':''}`} key={o.vehicle.id} onClick={()=>setVehicle(o.vehicle.id)}><VehicleIcon name={o.vehicle.iconKey} size={48}/><span>{o.vehicle.displayName}{o.vehicle.id===quoted.recommendedId&&<small>Recommended</small>}</span><strong>{money(o.quote.totalFare)}</strong></button>)}
 {selected&&<><Fare quote={selected.quote}/><p className="hint">30 minutes free for loading and 30 minutes free for unloading. Extra waiting: {money(selected.vehicle.waitingRateMin)} per minute. Cash/direct UPI to the driver after delivery.</p></>}
 <button onClick={book} disabled={busy}>{busy?'Creating booking…':'Confirm & request a truck'}</button></section>}
 {error&&<p className="error" role="alert">{error}</p>}</div>;
}

'use client';
import { useState } from 'react';
import { api,apiBase,currentLocation,token } from '@/lib/pilot/client';
import type { Snapshot } from '@/lib/pilot/model';
import { getVehicleById } from '@/config/vehicles';
import { Onboarding } from './Onboarding';
import { TripView } from './TripView';
export function DriverDashboard({snapshot,refresh}:{snapshot:Snapshot;refresh:()=>void}) {
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [edit,setEdit]=useState(false);const d=snapshot.driver;const isNative=typeof window!=='undefined'&&Boolean(window.PickrNative);
 async function toggle(){setBusy(true);setError('');try{if(!d?.online){const p=await currentLocation();await api('driver/position',p);}await api('driver/availability',{online:!d?.online});if(window.PickrNative){if(d?.online)window.PickrNative.stopDriver();else window.PickrNative.startDriver(token(),apiBase());}refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!d||edit)return <><Onboarding allowSkips={snapshot.settings.allow_skips} current={d} onDone={()=>{setEdit(false);refresh();}}/>{d&&<button className="secondary" onClick={()=>setEdit(false)}>Back to dashboard</button>}</>;
 const active=snapshot.trips.find(t=>t.id===d.active_booking_id);
 return <div className="stack"><section className="card stack"><div className="row"><div><h2>{d.vehicle_number}</h2><p>{getVehicleById(d.vehicle_type_id)?.displayName}</p></div><span className="pill">{d.approval}</span></div><button onClick={toggle} disabled={busy||!!d.active_booking_id}>{d.online?'Go offline':'Go online & share live GPS'}</button><p>{d.active_booking_id?'Reserved for your current trip. New requests are blocked.':d.online?'Waiting for nearby requests. Keep GPS and internet enabled.':'Offline. Go online to receive requests.'}</p><small>{d.position_at?`GPS ${new Date(d.position_at).toLocaleTimeString('en-IN')} · ${Math.round(d.accuracy||0)} m accuracy`:'No device location yet.'}</small>
 {!isNative&&<p className="notice">Web testing: GPS and alerts work while this page is visible. Use the Android APK for native background tracking.</p>}
 {isNative&&<button className="secondary" onClick={()=>window.PickrNative?.requestOverlay()}>Enable optional request overlay</button>}
 <button className="secondary" disabled={!!d.active_booking_id} onClick={()=>setEdit(true)}>Edit vehicle / onboarding</button></section>{error&&<p className="error">{error}</p>}
 {active&&<TripView trip={active} role="driver" settings={snapshot.settings} zones={snapshot.zones} refresh={refresh}/>}

 </div>;
}

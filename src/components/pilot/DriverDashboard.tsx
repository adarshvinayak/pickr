'use client';
import { useState } from 'react';
import { api,apiBase,currentLocation,token } from '@/lib/pilot/client';
import type { Snapshot } from '@/lib/pilot/model';
import { getVehicleById } from '@/config/vehicles';
import { Onboarding } from './Onboarding';
import {useLanguage} from './Experience';
import {StitchIcon} from './StitchIcon';
import {money} from './BookingForm';
import type {Trip} from '@/lib/pilot/model';
export function DriverDashboard({snapshot,refresh,onOpenTrip}:{snapshot:Snapshot;refresh:()=>void;onOpenTrip:(trip:Trip)=>void}) {
 const {t}=useLanguage();
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [edit,setEdit]=useState(false);const d=snapshot.driver;const isNative=typeof window!=='undefined'&&Boolean(window.PickrNative);
 async function toggle(){setBusy(true);setError('');try{if(!d?.online){const p=await currentLocation();await api('driver/position',p);}await api('driver/availability',{online:!d?.online});if(window.PickrNative){if(d?.online)window.PickrNative.stopDriver();else window.PickrNative.startDriver(token(),apiBase());}refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!d||edit)return <><Onboarding allowSkips={snapshot.settings.allow_skips} current={d} onDone={()=>{setEdit(false);refresh();}}/>{d&&<button className="secondary" onClick={()=>setEdit(false)}>Back to dashboard</button>}</>;
 const active=snapshot.trips.find(t=>t.id===d.active_booking_id);
 const today=new Date().toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'});const finished=snapshot.trips.filter(trip=>trip.status==='COMPLETED'&&trip.completed_at&&new Date(trip.completed_at).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})===today);const collected=finished.filter(trip=>trip.payment_status==='paid').reduce((sum,trip)=>sum+trip.payload.quote.totalFare,0);const gpsFresh=d.position_at&&Date.now()-Date.parse(d.position_at)<60000;
 return <div className="stack driver-console"><section className="card stack driver-status"><div className="row"><div><small className="eyebrow">{d.active_booking_id?t('ON A JOB','ജോലിയിലാണ്'):d.online?t('ONLINE · READY FOR JOBS','ഓൺലൈൻ · ജോലിക്ക് തയ്യാർ'):t('OFFLINE','ഓഫ്‌ലൈൻ')}</small><strong className="mono">{d.vehicle_number}</strong><small>{getVehicleById(d.vehicle_type_id)?.displayName}</small></div><StitchIcon name={d.approval==='approved'?'verified_user':'pending_actions'}/></div><div className="gps-strip"><StitchIcon name="my_location"/><small>{d.position_at?`${t('GPS','GPS')} ${new Date(d.position_at).toLocaleTimeString('en-IN')} · ${Math.round(d.accuracy||0)} m`:t('Waiting for GPS','GPS കാത്തിരിക്കുന്നു')}</small><span className={`status-tag ${gpsFresh?'good':''}`}>{gpsFresh?t('Fresh','പുതിയത്'):t('Check GPS','GPS പരിശോധിക്കുക')}</span></div><div className="availability-switch"><button className={!d.online?'offline-current':'secondary'} onClick={toggle} disabled={busy||!!d.active_booking_id||!d.online}>{t('Offline','ഓഫ്‌ലൈൻ')}</button><button className={d.online?'online-current':'secondary'} onClick={toggle} disabled={busy||!!d.active_booking_id||d.online}><StitchIcon name="sensors"/>{t('Online','ഓൺലൈൻ')}</button></div><p className="hint">{d.active_booking_id?t('Finish this job and collect payment before taking another.','അടുത്ത ജോലി സ്വീകരിക്കാൻ ഈ ജോലിയും പണം നൽകലും പൂർത്തിയാക്കുക.'):d.online?t('Waiting for nearby jobs. Keep GPS and internet on.','അടുത്തുള്ള ജോലികൾക്കായി കാത്തിരിക്കുന്നു. GPS-ഉം ഇന്റർനെറ്റും ഓണാക്കി വയ്ക്കുക.'):t('Go online when you are ready to take a job.','ജോലി സ്വീകരിക്കാൻ തയ്യാറാകുമ്പോൾ ഓൺലൈൻ ആകുക.')}</p></section>
 <section className="shift-summary"><StitchIcon name="receipt_long"/><div><small>{t('Today’s work','ഇന്നത്തെ ജോലി')}</small><strong>{finished.length} {t('finished trips','പൂർത്തിയായ യാത്രകൾ')} · {money(collected)} {t('collected','ലഭിച്ചു')}</strong></div></section>
 {!isNative&&<p className="notice">{t('Web alerts and GPS work while this page is visible. Use the APK for background tracking.','ഈ പേജ് തുറന്നിരിക്കുമ്പോൾ വെബിൽ അറിയിപ്പുകളും GPS-ഉം പ്രവർത്തിക്കും. പശ്ചാത്തല ട്രാക്കിംഗിന് APK ഉപയോഗിക്കുക.')}</p>}
 {isNative&&<button className="secondary" onClick={()=>window.PickrNative?.requestOverlay()}><StitchIcon name="layers"/>{t('Set up floating job alerts','ഫ്ലോട്ടിംഗ് അറിയിപ്പുകൾ സജ്ജമാക്കുക')}</button>}
 <button className="secondary" disabled={!!d.active_booking_id} onClick={()=>setEdit(true)}><StitchIcon name="tune"/>{t('Edit truck details','വണ്ടിയുടെ വിവരങ്ങൾ മാറ്റുക')}</button>{error&&<p className="error">{error}</p>}

 {active&&<section className="card stack"><small>{active.short_code}</small><h2>{t('Your current job','ഇപ്പോഴത്തെ ജോലി')}</h2><p>{active.payload.pickup.label} → {active.payload.drop.label}</p><button onClick={()=>onOpenTrip(active)}>{t('Continue this job','ജോലി തുടരുക')}</button></section>}

 </div>;
}

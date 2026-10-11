'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/pilot/client';
import type {Trip} from '@/lib/pilot/model';
import {money} from './BookingForm';
import {useLanguage} from './Experience';
import {getMaterialById} from '@/config/materials';
import {StitchIcon} from './StitchIcon';
export function DriverOffer({offers,refresh}:{offers:Trip[];refresh:()=>void}){
 const {t}=useLanguage();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [now,setNow]=useState(Date.now());const accept=useRef<HTMLButtonElement>(null);const offer=offers[0];
 useEffect(()=>{accept.current?.focus();setError('');},[offer?.id]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 async function respond(action:'accept'|'decline'){if(!offer)return;setBusy(true);setError('');try{await api(`offers/${offer.id}`,{action});refresh();}catch(e){setError((e as Error).message);refresh();}finally{setBusy(false);}}
 if(!offer)return null;
 const remaining=Math.max(0,300-Math.floor((now-Math.max(Date.parse(offer.search_started_at),Date.parse(offer.payload.scheduledFor)))/1000));
 return <section className="offer-dialog stack" role="dialog" aria-modal="true" aria-label={t('New truck request','പുതിയ വണ്ടി അഭ്യർത്ഥന')} onKeyDown={event=>{if(event.key!=='Tab')return;const buttons=event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!buttons.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}>
 <div className="row offer-heading"><h2><StitchIcon name="emergency_heat"/>{t('New job nearby','അടുത്ത് പുതിയ ജോലി')}</h2><span className="status-tag">{offer.short_code}</span></div><small><StitchIcon name="timer"/>{t('Search ends in','തിരച്ചിൽ അവസാനിക്കാൻ')} {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')} · {t('First to accept gets the job','ആദ്യം സ്വീകരിക്കുന്ന ഡ്രൈവറിന് ജോലി ലഭിക്കും')}</small><progress className="offer-progress" value={remaining} max={300} aria-label="Search time remaining"/>
 <div className="cargo-readout"><small>{t('LOAD','ലോഡ്')}</small><h2>{getMaterialById(offer.payload.materialId)?.displayName}</h2><strong>{offer.payload.quantity} {offer.payload.unit}{offer.payload.unit==='unit'?' · 100 CFT / unit':''}</strong></div>
 <div className="route-manifest"><div><StitchIcon name="pin_drop"/><section><small>{t('PICKUP','കയറ്റുന്ന സ്ഥലം')}</small><strong>{offer.payload.pickup.label}</strong><small>{offer.payload.pickup.address}</small></section></div><div><StitchIcon name="pin_drop"/><section><small>{t('DELIVERY','ഇറക്കുന്ന സ്ഥലം')} · {offer.payload.distanceKm} km</small><strong>{offer.payload.drop.label}</strong><small>{offer.payload.drop.address}</small></section></div></div>
 <div className="offer-fare"><div><strong>{t('Trip fare','യാത്രാ നിരക്ക്')}</strong><small>{t('Cash or direct UPI after delivery','ഡെലിവറിക്ക് ശേഷം പണം അല്ലെങ്കിൽ നേരിട്ട് UPI')}</small></div><strong>{money(offer.payload.quote.totalFare)}</strong></div>
 <div className="directives"><small><StitchIcon name="assignment"/> {t('Instructions','നിർദ്ദേശങ്ങൾ')}</small>{offer.payload.siteAccess==='narrow'&&<p>{t('Small road or narrow gate at a site. Check access.','സ്ഥലത്ത് ഇടുങ്ങിയ റോഡോ ഗേറ്റോ ഉണ്ട്. വഴി പരിശോധിക്കുക.')}</p>}{offer.payload.notes&&<p>{offer.payload.notes}</p>}<small>{t('30 minutes free for loading and 30 minutes for unloading.','കയറ്റാനും ഇറക്കാനും 30 മിനിറ്റ് വീതം സൗജന്യം.')}</small></div>
 <button ref={accept} disabled={busy||remaining===0} onClick={()=>respond('accept')}><StitchIcon name="local_shipping"/>{t('Take this job','ജോലി സ്വീകരിക്കുക')} · {money(offer.payload.quote.totalFare)}</button><button className="secondary" disabled={busy} onClick={()=>respond('decline')}><StitchIcon name="close"/>{t('Decline','വേണ്ട')}</button>{error&&<p role="alert" className="error">{error}</p>}</section>;
}

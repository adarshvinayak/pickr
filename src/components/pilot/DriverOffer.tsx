'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/pilot/client';
import type {Trip} from '@/lib/pilot/model';
import {money} from './BookingForm';
import {useLanguage} from './Experience';
import {getMaterialById} from '@/config/materials';
import {StitchIcon} from './StitchIcon';
import {Sites,Notice,quantityLabel} from './design/Primitives';
import {getVehicleById} from '@/config/vehicles';
export function DriverOffer({offers,refresh}:{offers:Trip[];refresh:()=>void}){
 const {t,language}=useLanguage();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [now,setNow]=useState(Date.now());const accept=useRef<HTMLButtonElement>(null);const offer=offers[0];
 useEffect(()=>{accept.current?.focus();setError('');},[offer?.id]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 async function respond(action:'accept'|'decline'){if(!offer)return;setBusy(true);setError('');try{await api(`offers/${offer.id}`,{action});refresh();}catch(e){setError((e as Error).message);refresh();}finally{setBusy(false);}}
 if(!offer)return null;
 const remaining=Math.max(0,300-Math.floor((now-Math.max(Date.parse(offer.search_started_at),Date.parse(offer.payload.scheduledFor)))/1000));
 return <section className="offer-dialog stack" role="dialog" aria-modal="true" aria-label={t('New truck request','പുതിയ വണ്ടി അഭ്യർത്ഥന')} onKeyDown={event=>{if(event.key!=='Tab')return;const buttons=event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!buttons.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}>
 <header className="offer-head"><span className="chip"><StitchIcon name="work" className="fill"/>{t('New job','പുതിയ ജോലി')}</span><div className="row spread"><h2>{t('A job near you','അടുത്ത് ഒരു ജോലി')}</h2><strong>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</strong></div><small>{t('Search ends in this time. First to accept gets the job.','ഈ സമയത്തിനുള്ളിൽ തിരച്ചിൽ അവസാനിക്കും. ആദ്യം ഏറ്റെടുക്കുന്ന ഡ്രൈവർക്കാണ് ജോലി.')}</small><progress value={remaining} max={300} aria-label={t('Search time remaining','തിരച്ചിൽ സമയം ബാക്കി')}/></header>
 <div className="offer-body"><p className="offer-distance"><StitchIcon name="route"/>{offer.payload.distanceKm} km {t('trip','യാത്ര')} · {t(`about ${offer.payload.durationMin} min drive`,`ഏകദേശം ${offer.payload.durationMin} മിനിറ്റ് യാത്ര`)}</p><Sites pickup={offer.payload.pickup} drop={offer.payload.drop}/><div className="offer-load"><strong>{getMaterialById(offer.payload.materialId)?.displayName} · {quantityLabel(offer.payload.quantity,offer.payload.unit,language==='ml')}</strong><small>{getVehicleById(offer.payload.vehicleTypeId)?.displayName}</small></div>{offer.payload.siteAccess==='narrow'&&<Notice tone="warning">{t('Narrow road at a site. Check access and call before arriving.','സൈറ്റിൽ ഇടുങ്ങിയ വഴിയാണ്. വഴി പരിശോധിച്ച് എത്തുന്നതിന് മുമ്പ് വിളിക്കുക.')}</Notice>}{offer.payload.forOther&&<Notice>Site contact: {offer.payload.forOther.name} · {offer.payload.forOther.phone}. Meets at {offer.payload.forOther.meets}; payer: {offer.payload.forOther.pays==='them'?'site contact':'customer'}.</Notice>}{offer.payload.notes&&<p className="sm ink2">{offer.payload.notes}</p>}<div className="offer-fare"><div><strong>{t('Fare','നിരക്ക്')}</strong><small>{t('Customer pays you after the work','ജോലി കഴിഞ്ഞ് ഉപഭോക്താവ് പണം നൽകും')}</small></div><strong>{money(offer.payload.quote.totalFare)}</strong></div>{error&&<p role="alert" className="error">{error}</p>}</div>
 <footer className="offer-actions"><button className="bx" disabled={busy} onClick={()=>respond('decline')}>{t('Decline','വേണ്ട')}</button><button ref={accept} className="bp" disabled={busy||remaining===0} onClick={()=>respond('accept')}>{busy?t('Please wait…','കാത്തിരിക്കൂ…'):t('Take job','ജോലി ഏറ്റെടുക്കുക')}</button></footer></section>;
}

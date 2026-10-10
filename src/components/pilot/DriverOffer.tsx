'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/pilot/client';
import type {Trip} from '@/lib/pilot/model';
import {money} from './BookingForm';
import {useLanguage} from './Experience';
import {getMaterialById} from '@/config/materials';
export function DriverOffer({offers,refresh}:{offers:Trip[];refresh:()=>void}) {
 const {t}=useLanguage();
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const accept=useRef<HTMLButtonElement>(null);const offer=offers[0];
 useEffect(()=>{accept.current?.focus();setError('');},[offer?.id]);
 async function respond(action:'accept'|'decline'){if(!offer)return;setBusy(true);setError('');try{await api(`offers/${offer.id}`,{action});refresh();}catch(e){setError((e as Error).message);refresh();}finally{setBusy(false);}}
 if(!offer)return null;
 return <section className="offer-dialog stack" role="dialog" aria-modal="true" aria-label="New truck request"><h2>{t('New job nearby','അടുത്ത് പുതിയ ജോലി')}</h2><strong>{offer.payload.quantity} {offer.payload.unit} · {getMaterialById(offer.payload.materialId)?.displayName}</strong><p>{offer.payload.pickup.label} → {offer.payload.drop.label}</p><h3>{money(offer.payload.quote.totalFare)}</h3><small>First available driver to accept gets the job. {offers.length} request(s) available.</small><button ref={accept} disabled={busy} onClick={()=>respond('accept')}>{t('Take this job','ജോലി സ്വീകരിക്കുക')}</button><button className="secondary" disabled={busy} onClick={()=>respond('decline')}>{t('Decline','വേണ്ട')}</button>{error&&<p className="error">{error}</p>}</section>;
}

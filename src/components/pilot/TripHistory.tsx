'use client';
import {useState} from 'react';
import type {Trip,Role} from '@/lib/pilot/model';
import {getMaterialById} from '@/config/materials';
import {money} from './BookingForm';
import {StitchIcon} from './StitchIcon';
import {useLanguage} from './Experience';
import {EmptyState,StatusChip,quantityLabel} from './design/Primitives';
const isPast=(trip:Trip)=>['CANCELLED','NO_DRIVERS'].includes(trip.status)||trip.status==='COMPLETED'&&trip.payment_status==='paid';
export function TripHistory({trips,role,onOpenTrip}:{trips:Trip[];role:Role;onOpenTrip:(trip:Trip)=>void}){
 const {t,language}=useLanguage();const [filter,setFilter]=useState('all');const finished=trips.filter(trip=>trip.status==='COMPLETED'&&trip.payment_status==='paid');
 const shown=trips.filter(trip=>filter==='all'||(filter==='scheduled'?trip.status==='SEARCHING'&&Date.parse(trip.payload.scheduledFor)>Date.now():isPast(trip)));
 return <div className="bd history-body" data-design-screen={role==='driver'?'D16':'C17'}><h1 className="h1">{t('Trips','യാത്രകൾ')}</h1>{role==='driver'&&<section className="card collection-summary"><small>{t('Recorded collections','ലഭിച്ചതായി രേഖപ്പെടുത്തിയ തുക')}</small><strong>{money(finished.reduce((sum,trip)=>sum+trip.payload.quote.totalFare,0))}</strong><small>{t('Cash and direct UPI received · not a wallet balance','ലഭിച്ച പണവും നേരിട്ടുള്ള UPI-യും · വാലറ്റ് ബാലൻസ് അല്ല')}</small></section>}
 <nav className="seg" aria-label="Trip filters">{[['all',t('All','എല്ലാം')],['scheduled',t('Scheduled','സമയം നിശ്ചയിച്ചത്')],['past',t('Past','പഴയത്')]].map(([value,label])=><button aria-pressed={filter===value} className={filter===value?'on':''} key={value} onClick={()=>setFilter(value)}>{label}</button>)}</nav>
 {!shown.length&&<EmptyState title={t('No trips to show','യാത്രകൾ ലഭ്യമല്ല')}>{t('Your trips will appear here.','നിങ്ങളുടെ യാത്രകൾ ഇവിടെ കാണാം.')}</EmptyState>}
 {[false,true].map(past=>{const group=shown.filter(trip=>isPast(trip)===past);return group.length>0&&<section className="history-group" key={String(past)}><h2>{past?t('PAST','പഴയത്'):t('ACTIVE','ഇപ്പോഴത്തെ')}</h2><div className={past?'card history-past':''}>{group.map(trip=><button className={`history-trip ${past?'li':'card active-history-trip'}`} key={trip.id} onClick={()=>onOpenTrip(trip)}><span className="col f1"><span className="row history-trip-heading"><strong>{trip.short_code}</strong><StatusChip trip={trip}/></span><small>{getMaterialById(trip.payload.materialId)?.displayName} · {quantityLabel(trip.payload.quantity,trip.payload.unit,language==='ml')} · {trip.payload.pickup.label} → {trip.payload.drop.label}</small><small>{new Date(trip.payload.scheduledFor).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {money(trip.status==='CANCELLED'?trip.payload.cancellationFee||0:trip.status==='NO_DRIVERS'?0:trip.payload.quote.totalFare)}{trip.status==='NO_DRIVERS'||trip.status==='CANCELLED'&&!trip.payload.cancellationFee?` · ${t('No charge','നിരക്കില്ല')}`:trip.status==='CANCELLED'?` · ${t('Cancellation fee','റദ്ദാക്കൽ നിരക്ക്')}`:trip.payment_status==='paid'?'':` · ${t('estimated','ഏകദേശ തുക')}`}</small></span><StitchIcon name="chevron_right"/></button>)}</div></section>;})}
 </div>;
}

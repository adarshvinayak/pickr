'use client';
import type {Trip} from '@/lib/pilot/model';
import {Fare,money} from '../BookingForm';
import {useLanguage} from '../Experience';
export function TripFare({trip,paid=false}:{trip:Trip;paid?:boolean}){
 const {t}=useLanguage();const q=trip.payload.quote;
 return <section className="card trip-fare-summary">{paid?<><div className="kv"><small>{t('Recorded','രേഖപ്പെടുത്തിയ തുക')}</small><strong className="big">{money(q.totalFare)}</strong></div><div className="kv"><small>{t('Method','പണം നൽകിയ മാർഗം')}</small><span>{trip.payload.collectionMethod==='upi'?'Direct UPI':t('Cash','പണം')} · {trip.paid_at?new Date(trip.paid_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):''}</span></div></>:<><div className="kv"><span>{t('Trip fare and fees','യാത്രയുടെ നിരക്കും ഫീസും')} · {q.billableKm} km</span><span>{money(q.totalFare-q.waitingFare)}</span></div><div className="kv"><span>{t('Extra waiting','അധിക കാത്തിരിപ്പ്')}</span><span>{money(q.waitingFare)}</span></div><div className="hr"/><div className="kv"><strong>{t('Total freight','ആകെ യാത്രാനിരക്ക്')}</strong><strong className="big">{money(q.totalFare)}</strong></div></>}<details><summary>{t('Full fare details','മുഴുവൻ നിരക്ക് വിവരങ്ങൾ')}</summary><Fare quote={q}/></details></section>;
}

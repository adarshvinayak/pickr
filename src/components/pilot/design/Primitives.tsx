'use client';
import type {ReactNode} from 'react';
import type {Point,Trip} from '@/lib/pilot/model';
import {StitchIcon as Icon} from '../StitchIcon';
import {useLanguage,tripStatus,tripStatusMl} from '../Experience';

export function Brand({driver=false,admin=false}:{driver?:boolean;admin?:boolean}){
 return <div className="app-brand"><span className="brand-mark"><Icon name="local_shipping" className="fill"/></span><strong>PICKR{driver?' Driver':admin?' Admin':''}</strong></div>;
}
export function ScreenHeader({title,step,onBack,children}:{title:string;step?:number;onBack?:()=>void;children?:ReactNode}){
 const {t}=useLanguage();return <><header className="hd" data-screen-header>{onBack&&<button className="ib" aria-label={t('Back','പിന്നോട്ട്')} onClick={onBack}><Icon name="arrow_back"/></button>}<span className="ht">{title}</span>{step!==undefined&&<span className="step">{t(`Step ${step} of 6`,`ഘട്ടം ${step} / 6`)}</span>}{children}</header>{step!==undefined&&<div className="prog" aria-label={t(`Step ${step} of 6`,`ഘട്ടം ${step} / 6`)}>{[1,2,3,4,5,6].map(n=><i key={n} className={n<=step?'on':''}/>)}</div>}</>;
}
export function Notice({children,tone='info',icon}:{children:ReactNode;tone?:'info'|'error'|'success'|'warning'|'dark';icon?:string}){
 const style={info:'b-i',error:'b-e',success:'b-g',warning:'b-a',dark:'b-k'}[tone];return <div className={`ban ${style}`}><Icon name={icon||{info:'info',error:'error',success:'check_circle',warning:'warning',dark:'wifi_off'}[tone]}/><div className="f1">{children}</div></div>;
}
export function StatusChip({trip}:{trip:Trip}){
 const {t}=useLanguage();const scheduled=trip.status==='SEARCHING'&&Date.parse(trip.payload.scheduledFor)>Date.now();const paid=trip.payment_status==='paid';
 const icon={SEARCHING:scheduled?'event':'travel_explore',ACCEPTED:'local_shipping',AT_PICKUP:'conveyor_belt',IN_TRANSIT:'route',AT_DROP:'move_to_inbox',COMPLETED:paid?'check_circle':'payments',CANCELLED:'cancel',NO_DRIVERS:'search_off'}[trip.status];
 const tone=['CANCELLED','NO_DRIVERS'].includes(trip.status)?'c-e':paid?'c-g':['AT_PICKUP','AT_DROP','COMPLETED'].includes(trip.status)?'c-a':'c-r';
 const label=scheduled?t('Scheduled','സമയം നിശ്ചയിച്ചു'):trip.status==='COMPLETED'?paid?t('Paid','പണം ലഭിച്ചു'):t('Payment due','പണം നൽകാനുണ്ട്'):t(tripStatus[trip.status],tripStatusMl[trip.status]);
 return <span className={`chip ${tone}`}><Icon name={icon}/>{label}</span>;
}
export function Sites({pickup,drop,compact=false}:{pickup:Point;drop:Point;compact?:boolean}){
 const {t}=useLanguage();return <div className={`site-route ${compact?'compact':''}`}>{[[pickup,t('Pickup','ലോഡ് എടുക്കുന്ന സ്ഥലം')],[drop,t('Delivery','ലോഡ് എത്തിക്കുന്ന സ്ഥലം')]].map(([p,label],i)=>{const point=p as Point;return <div className="route-stop" key={i}><span className={`route-marker ${i?'destination':''}`}/><div className="f1"><small>{label as string}</small><strong>{point.label}</strong>{!compact&&point.address&&<small>{point.address}</small>}</div></div>;})}</div>;
}
export function quantityLabel(quantity:number,unit:string,malayalam=false):string{
 if(unit==='unit')return `${quantity} ${malayalam?'ബൾക്ക് യൂണിറ്റ്':`bulk unit${quantity===1?'':'s'}`}`;
 const words:Record<string,string>={bag:malayalam?'ചാക്ക്':quantity===1?'bag':'bags',nos:malayalam?'എണ്ണം':'pieces',load:malayalam?'ലോഡ്':quantity===1?'load':'loads',box:malayalam?'പെട്ടി':quantity===1?'box':'boxes',bundle:malayalam?'കെട്ട്':quantity===1?'bundle':'bundles'};
 return `${quantity} ${words[unit]||unit}`;
}
export function EmptyState({title,children,icon='receipt_long'}:{title:string;children?:ReactNode;icon?:string}){
 return <section className="empty-state"><span className="empty-icon"><Icon name={icon}/></span><h2>{title}</h2>{children&&<p>{children}</p>}</section>;
}

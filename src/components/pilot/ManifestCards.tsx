"use client";
import type {Point} from '@/lib/pilot/model';
import {StitchIcon} from './StitchIcon';
import {useLanguage} from './Experience';
export function RouteManifest({pickup,drop}:{pickup:Point;drop:Point}){
 const {t}=useLanguage();
 return <section className="route-card"><header><StitchIcon name="route"/><strong>{t('Pickup and delivery','കയറ്റുന്നതും ഇറക്കുന്നതും')}</strong></header>{[[pickup,t('Pickup','കയറ്റുന്ന സ്ഥലം')],[drop,t('Delivery','ഇറക്കുന്ന സ്ഥലം')]].map(([point,title],i)=>{const p=point as Point;return <div className="route-stop" key={i}><span className={`stop-node ${i?'drop-node':''}`}><StitchIcon name="pin_drop"/></span><div><small>{title as string}</small><strong>{p.label}</strong><small>{p.address}</small></div></div>;})}</section>;
}
export function PilotIntroduction({driver=false}:{driver?:boolean}){
 const {t}=useLanguage();
 return <section className="pilot-introduction stack"><span className="status-tag"><StitchIcon name="location_on"/>{t('Thrissur pilot · construction loads','തൃശ്ശൂർ പരീക്ഷണം · നിർമാണ ലോഡുകൾ')}</span><small className="eyebrow">{t('SITE TO SITE · PICKR','സ്ഥലത്തുനിന്ന് സ്ഥലത്തേക്ക് · PICKR')}</small><h1>{driver?t('Your truck. Your next job.','നിങ്ങളുടെ വണ്ടി. അടുത്ത ജോലി.'):t('A truck for your construction site.','നിങ്ങളുടെ പണിസ്ഥലത്തേക്ക് ഒരു വണ്ടി.')}</h1><p>{driver?t('Receive nearby requests, reach the site and finish one job at a time.','അടുത്തുള്ള ജോലികൾ സ്വീകരിച്ച് സ്ഥലത്തെത്തി ഒരു ജോലി വീതം പൂർത്തിയാക്കാം.'):t('Move sand, cement and site materials. Choose the right truck and follow your delivery.','മണലും സിമന്റും മറ്റു നിർമാണ സാധനങ്ങളും കൊണ്ടുപോകാം. വണ്ടി തിരഞ്ഞെടുത്ത് യാത്ര കാണാം.')}</p><div className="intro-metrics"><div><StitchIcon name="local_shipping"/><strong>{t('Site transfers','ലോഡ് യാത്രകൾ')}</strong><small>{t('Construction materials only','നിർമാണ സാധനങ്ങൾ മാത്രം')}</small></div><div><StitchIcon name="location_on"/><strong>{t('Live location','തത്സമയ സ്ഥാനം')}</strong><small>{t('From the driver’s GPS','ഡ്രൈവറുടെ GPS വഴി')}</small></div></div><div className="feature-chips"><span><StitchIcon name="payments"/>{t('Cash / direct UPI','പണം / നേരിട്ട് UPI')}</span><span><StitchIcon name="timer"/>{t('30 min free loading','കയറ്റാൻ 30 മിനിറ്റ് സൗജന്യം')}</span></div></section>;
}

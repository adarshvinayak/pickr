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
 return <section className="pilot-introduction"><div className="login-truck"><StitchIcon name="local_shipping"/></div><h1>{driver?t('PICKR Driver','PICKR ഡ്രൈവർ'):t('A truck for your site','നിങ്ങളുടെ സ്ഥലത്തേക്ക് ഒരു വണ്ടി')}</h1><p>{driver?t('Nearby jobs. Clear instructions. One trip at a time.','അടുത്തുള്ള ജോലികൾ. വ്യക്തമായ നിർദ്ദേശങ്ങൾ. ഒരു യാത്ര വീതം.'):t('Move construction materials. Book, follow your truck and pay after delivery.','നിർമാണ സാധനങ്ങൾ കൊണ്ടുപോകാം. വണ്ടി ബുക്ക് ചെയ്ത് യാത്ര കാണാം.')}</p><div className="feature-chips"><span><StitchIcon name="payments"/>{t('Cash / direct UPI','പണം / നേരിട്ട് UPI')}</span><span><StitchIcon name="call"/>{t('Direct contact','നേരിട്ട് വിളിക്കാം')}</span></div></section>;
}

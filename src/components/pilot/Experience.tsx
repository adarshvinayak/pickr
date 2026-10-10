'use client';
import {useEffect,useState} from 'react';
export function useLanguage(){
 const [language,setLanguage]=useState('en');
 useEffect(()=>{const read=()=>{const value=localStorage.getItem('pickr-language')||'en';setLanguage(value);document.documentElement.lang=value==='ml'?'ml':'en';};read();window.addEventListener('pickr-language',read);return()=>window.removeEventListener('pickr-language',read);},[]);
 return {language,t:(en:string,ml:string)=>language==='ml'?ml:en,setLanguage:(value:string)=>{localStorage.setItem('pickr-language',value);window.dispatchEvent(new Event('pickr-language'));}};
}
export function LanguageSwitch(){const {language,setLanguage}=useLanguage();return <select className="language-switch" aria-label="Language / ഭാഷ" value={language} onChange={e=>setLanguage(e.target.value)}><option value="en">English</option><option value="ml">മലയാളം</option></select>;}
export const tripStatus:Record<string,string>={SEARCHING:'Finding a truck',ACCEPTED:'Driver coming',AT_PICKUP:'Loading',IN_TRANSIT:'On the way',AT_DROP:'Unloading',COMPLETED:'Finished',CANCELLED:'Cancelled',NO_DRIVERS:'No truck found'};
export const tripStatusMl:Record<string,string>={SEARCHING:'വണ്ടി തിരയുന്നു',ACCEPTED:'ഡ്രൈവർ വരുന്നു',AT_PICKUP:'ലോഡ് കയറ്റുന്നു',IN_TRANSIT:'യാത്രയിലാണ്',AT_DROP:'ലോഡ് ഇറക്കുന്നു',COMPLETED:'പൂർത്തിയായി',CANCELLED:'റദ്ദാക്കി',NO_DRIVERS:'വണ്ടി ലഭിച്ചില്ല'};

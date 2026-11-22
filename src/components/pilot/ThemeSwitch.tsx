'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun,Monitor} from 'lucide-react';
import {useLanguage} from './Experience';
type Theme='light'|'dark'|'system';
function read():Theme{try{const value=localStorage.getItem('pickr-theme');return value==='light'||value==='dark'?value:'system';}catch{return 'system';}}
export function useTheme(){
 const [theme,setTheme]=useState<Theme>('system');const [resolved,setResolved]=useState<'light'|'dark'>('light');
 useEffect(()=>{
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const apply=()=>{const value=read();setTheme(value);const active=value==='system'?(media.matches?'dark':'light'):value;setResolved(active);document.documentElement.dataset.pickrTheme=active;window.PickrNative?.setTheme?.(active);};
  apply();media.addEventListener('change',apply);window.addEventListener('pickr-theme',apply);window.addEventListener('storage',apply);
  return()=>{media.removeEventListener('change',apply);window.removeEventListener('pickr-theme',apply);window.removeEventListener('storage',apply);};
 },[]);
 return {theme,resolved,setTheme:(value:Theme)=>{try{localStorage.setItem('pickr-theme',value);}catch{}document.documentElement.dataset.pickrTheme=value==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):value;window.dispatchEvent(new Event('pickr-theme'));}};
}
export function ThemeSwitch({compact=false}:{compact?:boolean}){
 const {theme,resolved,setTheme}=useTheme();const {t}=useLanguage();
 if(compact)return <button className="ib theme-toggle" type="button" aria-label={t('Switch light or dark theme','ലൈറ്റ് അല്ലെങ്കിൽ ഡാർക്ക് തീം മാറ്റുക')} onClick={()=>setTheme(document.documentElement.dataset.pickrTheme==='dark'?'light':'dark')}>{resolved==='dark'?<Sun size={20}/>:<Moon size={20}/>}</button>;
 return <fieldset className="theme-settings"><legend>{t('Appearance','രൂപം')}</legend><div>{(['light','dark','system'] as const).map((value,i)=>{const Symbol=[Sun,Moon,Monitor][i];return <button type="button" className="bs" aria-pressed={theme===value} key={value} onClick={()=>setTheme(value)}><Symbol size={18}/>{[t('Light','ലൈറ്റ്'),t('Dark','ഡാർക്ക്'),t('Auto','ഓട്ടോ')][i]}</button>;})}</div></fieldset>;
}

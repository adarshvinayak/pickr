'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from './Experience';

export function ReleaseNotice(){
 const [available,setAvailable]=useState(false);const {t}=useLanguage();
 useEffect(()=>{
  // APKs contain their own UI bundle and must be updated by installing a new APK.
  if(window.PickrNative)return;
  let stopped=false;let checking=false;
  async function check(){
   if(checking||document.hidden)return;checking=true;
   try{const response=await fetch('/api/release',{cache:'no-store'});if(!response.ok)return;const body=await response.json();if(!stopped&&body.data?.release&&process.env.NEXT_PUBLIC_PICKR_RELEASE&&body.data.release!==process.env.NEXT_PUBLIC_PICKR_RELEASE)setAvailable(true);}catch{/* Retry on focus or next interval. */}finally{checking=false;}
  }
  void check();const interval=setInterval(()=>void check(),60000);const focus=()=>void check();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{stopped=true;clearInterval(interval);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[]);
 if(!available)return null;
 return <aside className="notice release-notice" role="status"><span>{t('An app update is ready. Refresh to get the latest fixes.','ആപ്പിന്റെ പുതിയ പതിപ്പ് തയ്യാറാണ്. പുതുക്കിയ പതിപ്പ് തുറക്കുക.')}</span><button type="button" className="bs" onClick={()=>window.location.reload()}>{t('Refresh app','ആപ്പ് പുതുക്കുക')}</button></aside>;
}

"use client";
/* Native Vite also uses this component; signed private images cannot use the Next image proxy. */
/* eslint-disable @next/next/no-img-element */
import {useEffect,useState} from 'react';
import {api,external} from '@/lib/pilot/client';
import {StitchIcon} from './StitchIcon';
export function LoadPhotos({paths}:{paths:string[]}){
 const [urls,setUrls]=useState<Record<string,string>>({});
 const key=JSON.stringify(paths);
 useEffect(()=>{let active=true;const files=JSON.parse(key) as string[];void Promise.allSettled(files.map(async path=>({path,url:(await api<{url:string}>(`file?path=${encodeURIComponent(path)}`)).url}))).then(results=>{if(active)setUrls(Object.fromEntries(results.flatMap(result=>result.status==='fulfilled'?[[result.value.path,result.value.url]]:[])));});return()=>{active=false;};},[key]);
 async function open(path:string){try{external((await api<{url:string}>(`file?path=${encodeURIComponent(path)}`)).url);}catch{setUrls(current=>({...current,[path]:''}));}}
 return <div className="photo-grid">{paths.map((path,i)=><button className="secondary" key={path} onClick={()=>void open(path)}>{urls[path]?<img src={urls[path]} alt={`Load photo ${i+1}`} onError={()=>setUrls(current=>({...current,[path]:''}))}/>:<StitchIcon name="photo_camera"/>}<small>View load photo {i+1}</small></button>)}</div>;
}

'use client';
import {useEffect,useState} from 'react';
import {api,apiBase,token} from '@/lib/pilot/client';
import type {DriverProfile,Role} from '@/lib/pilot/model';
export function useDriverTracking(driver:DriverProfile|null|undefined,role:Role):string {
 const [error,setError]=useState('');
 useEffect(()=>{if(role!=='driver'||(!driver?.online&&!driver?.active_booking_id))return;
 if(window.PickrNative){window.PickrNative.startDriver(token(),apiBase());return;}
 let sent=0;
 const id=navigator.geolocation.watchPosition(p=>{if(Date.now()-sent<10000)return;sent=Date.now();void api('driver/position',{lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,sampledAt:new Date(p.timestamp).toISOString()}).then(()=>setError('')).catch(e=>setError(e.message));},e=>setError(`GPS: ${e.message}`),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
 return()=>navigator.geolocation.clearWatch(id);
 },[driver?.online,driver?.active_booking_id,role]);return error;
}

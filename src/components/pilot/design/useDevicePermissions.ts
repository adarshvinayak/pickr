'use client';
import {useEffect,useState} from 'react';
export interface DevicePermissions {location:'granted'|'approximate'|'denied'|'prompt'|'unknown';notifications:boolean|null;overlay:boolean|null;gps:boolean|null;native:boolean}
export function useDevicePermissions():DevicePermissions{
 const [state,setState]=useState<DevicePermissions>({location:'unknown',notifications:null,overlay:null,gps:null,native:false});
 useEffect(()=>{
  let active=true;let permission:PermissionStatus|undefined;
  async function read(){
   const native=Boolean(window.PickrNative);let next:DevicePermissions={location:'unknown',notifications:typeof Notification==='undefined'?null:Notification.permission==='granted',overlay:null,gps:null,native};
   try{if(window.PickrNative?.getDevicePermissions){const actual=JSON.parse(window.PickrNative.getDevicePermissions()) as Partial<DevicePermissions>;next={...next,...actual,native};}else if(navigator.permissions){permission=await navigator.permissions.query({name:'geolocation'});next.location=permission.state;permission.onchange=()=>void read();}}catch{/* Unavailable APIs remain unknown, never presented as allowed. */}
   if(active)setState(next);
  }
  void read();window.addEventListener('focus',read);window.addEventListener('pickr-native',read);
  return()=>{active=false;window.removeEventListener('focus',read);window.removeEventListener('pickr-native',read);if(permission)permission.onchange=null;};
 },[]);return state;
}

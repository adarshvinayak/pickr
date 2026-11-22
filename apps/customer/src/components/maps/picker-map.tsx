import {type Ref,useImperativeHandle,useState} from 'react';
import {ServerMap} from './server-map';
import {getSnapshot} from '@/lib/api';
export type LatLng={latitude:number;longitude:number};
export type PickerMapHandle={centerOn:(p:LatLng)=>void;zoomBy:(n:number)=>void};
export const MAPS_AVAILABLE=true;export const PICKER_IS_DEMO=false;
export function PickerMap({initial,onMoveStart,onIdle,ref}: {initial:LatLng;onMoveStart:()=>void;onIdle:(p:LatLng)=>void;onUserGesture?:()=>void;ref?:Ref<PickerMapHandle>}){const [point,setPoint]=useState(initial);useImperativeHandle(ref,()=>({centerOn:setPoint,zoomBy:()=>{}}));return <ServerMap config={{centerPin:true,points:[{lat:point.latitude,lng:point.longitude,label:'Selected site',address:'',kind:'pickup'}],zones:getSnapshot()?.zones||[]}} onMoving={(moving:boolean)=>{if(moving)onMoveStart();}} onPoint={(p:any)=>onIdle({latitude:p.lat,longitude:p.lng})}/>;}

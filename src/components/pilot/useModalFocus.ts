'use client';
import {useEffect,useRef} from 'react';
/** Keep confirmation/drawer keyboard and Android Back actions inside the modal. */
export function useModalFocus(open:boolean,onClose:()=>void){
 const ref=useRef<HTMLElement|null>(null);const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open)return;const previous=document.activeElement as HTMLElement|null;
  const controls=()=>Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')||[]).filter(el=>el.getClientRects().length);
  const first=controls()[0];first?.focus();
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close.current();}if(event.key==='Tab'){const items=controls();const start=items[0],end=items.at(-1);if(event.shiftKey&&document.activeElement===start){event.preventDefault();end?.focus();}else if(!event.shiftKey&&document.activeElement===end){event.preventDefault();start?.focus();}}};
  const back=(event:Event)=>{event.preventDefault();event.stopImmediatePropagation();close.current();};
  document.addEventListener('keydown',key);window.addEventListener('pickr-back',back,true);
  return()=>{document.removeEventListener('keydown',key);window.removeEventListener('pickr-back',back,true);previous?.focus();};
 },[open]);return ref;
}

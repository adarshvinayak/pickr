'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useModalFocus} from '../useModalFocus';
const ConfirmContext=createContext<(message:string)=>Promise<boolean>>(async()=>false);
export function useConfirm(){return useContext(ConfirmContext);}
export function ConfirmProvider({children}:{children:ReactNode}){
 const [message,setMessage]=useState('');const resolve=useRef<((value:boolean)=>void)|null>(null);
 function finish(value:boolean){resolve.current?.(value);resolve.current=null;setMessage('');}
 const modalRef=useModalFocus(Boolean(message),()=>finish(false));
 useEffect(()=>()=>{resolve.current?.(false);},[]);
 const confirm=(text:string)=>new Promise<boolean>(done=>{resolve.current?.(false);resolve.current=done;setMessage(text);});
 return <ConfirmContext.Provider value={confirm}>{children}{message&&<div className="admin-confirm-backdrop"><section ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title" className="admin-confirm-modal"><h2 id="admin-confirm-title">Confirm change</h2><p>{message}</p><div className="rw actions"><button className="btn bs" onClick={()=>finish(false)}>Go back</button><button className="btn bp" onClick={()=>finish(true)}>Confirm change</button></div></section></div>}</ConfirmContext.Provider>;
}

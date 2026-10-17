import {Maximize,RotateCcw,History} from 'lucide-react';
export function StitchIcon({name,className=''}:{name:string;className?:string}){
 const Vector=name==='fullscreen'?Maximize:name==='replay'?RotateCcw:name==='history'?History:undefined;
 return <span className={`material-symbols-outlined ${className}`} aria-hidden="true" style={Vector?{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'1em',height:'1em',lineHeight:1}:undefined}>{Vector?<Vector width="1em" height="1em" strokeWidth={2}/>:name}</span>;
}

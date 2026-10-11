'use client';
import { useEffect,useRef,useState } from 'react';
import type { Point,VoiceResult,Zone } from '@/lib/pilot/model';
import { api,say } from '@/lib/pilot/client';
import { LocationPicker } from './LocationPicker';
import {useLanguage} from './Experience';
const empty:VoiceResult={material:null,quantity:null,unit:null,pickupText:null,dropText:null,when:null,labourNeeded:null,siteAccess:null,confidence:0,nextQuestion:{slot:'material',text:'Tell me what you need moved.',chips:['M-Sand','Cement','Bricks','Mixed / Other']},readyToConfirm:false};
interface Recognition { lang:string;interimResults:boolean;onresult:((e:{results:{transcript:string}[][]})=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start():void;stop():void }
export function VoiceIntake({onDone,onPickup,onDrop,pickup,drop,zones}:{onDone:(slots:VoiceResult)=>void;onPickup:(point:Point)=>void;onDrop:(point:Point)=>void;pickup:Point|null;drop:Point|null;zones:Zone[]}) {
 const {language:appLanguage,t}=useLanguage();
 const [slots,setSlots]=useState<VoiceResult>(empty);const [text,setText]=useState('');const [error,setError]=useState('');const [listening,setListening]=useState(false);const [busy,setBusy]=useState(false);const [language,setLanguage]=useState(appLanguage==='ml'?'ml-IN':'en-IN');const recognition=useRef<Recognition|null>(null);const failures=useRef(0);const auto=useRef(false);const listenRef=useRef<()=>void>(()=>{});
 const slotsRef=useRef(slots);slotsRef.current=slots;
 async function process(transcript:string,current=slotsRef.current){setBusy(true);setError('');try{const parsed=await api<VoiceResult>('voice/parse',{transcript,currentSlots:current});setSlots(parsed);setText('');failures.current=0;if(parsed.nextQuestion){if(['pickupLocation','dropLocation'].includes(parsed.nextQuestion.slot))auto.current=false;say(parsed.nextQuestion.text);}else auto.current=false;}catch(e){setError((e as Error).message);}finally{setBusy(false);setListening(false);}}
 function listen(){setError('');setListening(true);auto.current=true;
 if(window.PickrNative){window.PickrNative.listen(language);return;}
 const Speech=(window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition}).SpeechRecognition||(window as unknown as {webkitSpeechRecognition?:new()=>Recognition}).webkitSpeechRecognition;
 if(!Speech){auto.current=false;setError('Speech recognition is unavailable in this browser. Use the text field and choices below.');setListening(false);return;}
 const r=new Speech();recognition.current=r;r.lang=language;r.interimResults=false;r.onresult=e=>void process(e.results[0][0].transcript);r.onerror=e=>{auto.current=false;failures.current++;setError(failures.current>=2?'Use the text field or picker for this answer.':`Microphone: ${e.error}. Try again or type your answer.`);setListening(false);};r.onend=()=>setListening(false);r.start();
 }
 listenRef.current=listen;
 useEffect(()=>{const done=()=>{if(auto.current)listenRef.current();};window.addEventListener('pickr-tts-end',done);const handler=(event:Event)=>{const data=(event as CustomEvent<{transcript?:string;error?:string}>).detail;if(data.transcript)void process(data.transcript);else{auto.current=false;setError(data.error||'Speech recognition failed. Type your answer.');setListening(false);}};window.addEventListener('pickr-speech',handler);return()=>{window.removeEventListener('pickr-speech',handler);window.removeEventListener('pickr-tts-end',done);recognition.current?.stop();window.PickrNative?.stopListening();auto.current=false;};},[]); // process reads current slots from the ref
 function location(point:Point,kind:'pickup'|'drop'){if(kind==='pickup')onPickup(point);else onDrop(point);const updated={...slots,[kind==='pickup'?'pickupText':'dropText']:point.label};setSlots(updated);void process('Continue',updated);}
 const needsPickup=slots.nextQuestion?.slot==='pickupLocation'||slots.pickupText&&!pickup;const needsDrop=!needsPickup&&(slots.nextQuestion?.slot==='dropLocation'||slots.dropText&&!drop);
 return <section className="card voice-box stack"><div className="row"><strong>{t('Speak to book','പറഞ്ഞ് ബുക്ക് ചെയ്യാം')}</strong><select aria-label="Voice language" value={language} onChange={e=>setLanguage(e.target.value)}><option value="en-IN">English</option><option value="ml-IN">Malayalam</option></select></div>
 <p>{needsPickup?'Confirm the exact pickup location.':needsDrop?'Confirm the exact destination.':slots.nextQuestion?.text||'Review the captured instructions.'}</p>
 <small>{[slots.material?.replaceAll('_',' '),slots.quantity&&`${slots.quantity} ${slots.unit}`,slots.pickupText&&`From ${slots.pickupText}`,slots.dropText&&`To ${slots.dropText}`].filter(Boolean).join(' · ')}</small>
 <button type="button" onClick={listen} disabled={busy||listening}>{listening?t('Listening…','കേൾക്കുന്നു…'):t('Tap and speak','അമർത്തി പറയുക')}</button>
 <button type="button" className="secondary" onClick={()=>{auto.current=false;recognition.current?.stop();window.PickrNative?.stopListening();setListening(false);}}>{t('Stop listening · type instead','കേൾക്കുന്നത് നിർത്തുക · ടൈപ്പ് ചെയ്യാം')}</button>
 <div className="row"><input aria-label="Typed voice instruction" value={text} onChange={e=>setText(e.target.value)} placeholder="Or type your answer" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void process(text);}}}/><button type="button" className="secondary" onClick={()=>process(text)} disabled={busy||!text}>Send</button></div>
 <div className="chips">{slots.nextQuestion?.chips.map(chip=><button type="button" className="secondary" key={chip} onClick={()=>{if(/map|location|saved|time|quantity/i.test(chip)){setText(chip.includes('time')?'':chip);return;}void process(chip);}}>{chip}</button>)}</div>
 {needsPickup&&<><p className="hint">Search for “{slots.pickupText||'pickup address'}” or place a pin.</p><LocationPicker label="Voice pickup" value={pickup} onChange={p=>location(p,'pickup')} zones={zones}/></>}
 {needsDrop&&<><p className="hint">Search for “{slots.dropText||'destination'}” or place a pin.</p><LocationPicker label="Voice destination" value={drop} onChange={p=>location(p,'drop')} zones={zones}/></>}
 {slots.readyToConfirm&&pickup&&drop&&<button type="button" onClick={()=>onDone(slots)}>Use these instructions & review vehicle</button>}
 {error&&<p className="error">{error}</p>}<small>Prices and vehicle selection are calculated after confirming exact locations. Voice service availability depends on the device and connection.</small></section>;
}

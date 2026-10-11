'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { api,apiBase,currentLocation,setToken,token,useRole } from '@/lib/pilot/client';
import { serviceable } from '@/lib/pilot/geo';
import {requestForSession} from '@/lib/pilot/session';
import type { Account,Role,Snapshot,Trip } from '@/lib/pilot/model';
import { BookingForm } from './BookingForm';
import { TripView } from './TripView';
import { DriverDashboard } from './DriverDashboard';
import { DriverOffer } from './DriverOffer';
import { useDriverTracking } from './useDriverTracking';
import { AdminConsole } from './AdminConsole';
import {LanguageSwitch,useLanguage} from './Experience';
import {StitchIcon} from './StitchIcon';
import {AccountScreen} from './AccountScreen';
import {PilotIntroduction} from './ManifestCards';
import {CustomerHome} from './CustomerHome';
import {TripHistory} from './TripHistory';
import {Onboarding} from './Onboarding';
export function PilotApp({role}:{role:Role}) {
 const {t}=useLanguage();
 const refreshSequence=useRef(0);const appliedSequence=useRef(0);
 useRole(role);const [snapshot,setSnapshot]=useState<Snapshot|null>(null);const [signed,setSigned]=useState(false);const [loading,setLoading]=useState(true);const [name,setName]=useState('');const [phone,setPhone]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [view,setView]=useState<'home'|'book'|'history'|'trip'|'account'|'vehicle'>('home');const [selected,setSelected]=useState<string|null>(null);const [voice,setVoice]=useState(false);const [connection,setConnection]=useState(true);const [area,setArea]=useState('');const [backend,setBackend]=useState('');const [native,setNative]=useState(false);
 const refresh=useCallback(async()=>{if(!token()){setLoading(false);return;}const sequence=++refreshSequence.current;try{const result=await requestForSession(token,()=>api<Snapshot>('snapshot'));if(result.kind==='stale'||sequence<appliedSequence.current)return;if(result.kind==='error')throw result.error;const value=result.value;appliedSequence.current=sequence;setSnapshot(value);setSigned(true);setConnection(true);setError('');window.PickrNative?.configurePush(token(),apiBase());}catch(e){if((e as Error & {status?:number}).status===401){setToken('');window.PickrNative?.stopDriver();setSnapshot(null);setSigned(false);setError('Please sign in again.');}else{setError((e as Error).message);setConnection(false);}}finally{setLoading(false);}},[]);
 useEffect(()=>{setNative(Boolean(window.PickrNative));setBackend(apiBase());void refresh();const interval=setInterval(refresh,role==='admin'?6000:3000);const focus=()=>void refresh();window.addEventListener('focus',focus);window.addEventListener('online',focus);const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);const back=(event:Event)=>{if(event.defaultPrevented||document.querySelector('[role="dialog"][aria-modal="true"]'))return;if(window.location.hash&&window.location.hash!=='#home'){event.preventDefault();window.history.back();}};window.addEventListener('pickr-back',back);const nativeEvent=(e:Event)=>{const detail=(e as CustomEvent<{error?:string}>).detail;if(detail.error)setError(detail.error);else void refresh();};window.addEventListener('pickr-native',nativeEvent);return()=>{clearInterval(interval);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);window.removeEventListener('pickr-native',nativeEvent);window.removeEventListener('pickr-back',back);};},[refresh,role]);
 useEffect(()=>{const read=()=>{window.scrollTo({top:0,behavior:'instant'});const [page,id]=window.location.hash.slice(1).split('/');setView(['book','history','trip','account','vehicle'].includes(page)?page as 'book'|'history'|'trip'|'account'|'vehicle':'home');if(page==='trip')setSelected(id||null);};read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 function navigate(page:'home'|'book'|'history'|'trip'|'account'|'vehicle'){window.location.hash=page==='book'?'book/0':page;setView(page);}
 async function signIn(){setBusy(true);setError('');try{const result=await api<{account:Account;token:string}>(role==='admin'?'admin/login':'login',role==='admin'?{phone,password}:{name,phone,role});setToken(result.token);setSigned(true);await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function signOut(){setError('');try{await api('logout',{});window.PickrNative?.stopDriver();if(snapshot)sessionStorage.removeItem(`pickr-draft-${snapshot.account.id}`);setToken('');setSnapshot(null);setSigned(false);navigate('home');}catch(e){setError((e as Error).message);}}
 function openTrip(t:Trip){appliedSequence.current=++refreshSequence.current;setSnapshot(current=>current&&!current.trips.some(item=>item.id===t.id)?{...current,trips:[t,...current.trips]}:current);setSelected(t.id);setView('trip');window.location.hash=`trip/${t.id}`;void refresh();}
 async function checkArea(){try{const p=await currentLocation();setArea(serviceable(p,snapshot?.zones||[])?'Your device is inside an active service area.':'Your device is outside the service area. You can still book between two sites inside an active area.');}catch(e){setArea((e as Error).message);}}
 const lastDriverJob=useRef<string|null>(null);
 useEffect(()=>{const id=snapshot?.driver?.active_booking_id||null;if(role==='driver'&&id&&id!==lastDriverJob.current){setSelected(id);setView('trip');window.location.hash=`trip/${id}`;}lastDriverJob.current=id;},[snapshot,role]);
 const gpsError=useDriverTracking(snapshot?.driver,role);
 const active=snapshot?.trips.find(t=>!['CANCELLED','NO_DRIVERS'].includes(t.status)&&!(t.status==='COMPLETED'&&t.payment_status==='paid'));
 const selectedTrip=snapshot?.trips.find(t=>t.id===selected);const canLogout=!active||role==='admin';
 return <div className={`pilot-shell ${role==='admin'?'admin-shell':`${role}-shell`} ${signed?'is-signed':'is-login'}`}><header className="pilot-header"><a href="#home" aria-label="PICKR home" className="brand"><span className="brand-title"><StitchIcon name="local_shipping"/> PICKR{role==='driver'&&<b className="driver-tag">DRIVER</b>}</span><small>{role==='admin'?'DISPATCH OPERATOR':view==='book'?t('Book a truck','വണ്ടി ബുക്ക് ചെയ്യുക'):view==='trip'?t('Your current trip','ഇപ്പോഴത്തെ യാത്ര'):t('Construction logistics','നിർമാണ ലോഡ് യാത്ര')}</small></a><LanguageSwitch/>{signed&&role==='admin'&&<button className="secondary" onClick={signOut}>Sign out</button>}</header>
 {gpsError&&<p className="error" role="alert">{gpsError}</p>}{error&&<p className="error" role="alert">{error}</p>}{signed&&!connection&&<p className="notice">Connection interrupted. Last known data is shown; requests require a connection.</p>}
 {!signed&&<div className="stack login-layout">{role!=='admin'&&<PilotIntroduction driver={role==='driver'}/>}<section className="card stack login-card"><span className="status-tag good">{role==='admin'?'ADMIN':'PRIVATE PILOT · THRISSUR'}</span>{role==='admin'&&<h2>Admin sign in</h2>}<p>{role==='admin'?'Use your admin phone and password.':'Enter your name and mobile number to join the pilot.'}</p>{role!=='admin'&&<label>{t('Your name','നിങ്ങളുടെ പേര്')}<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} maxLength={100}/></label>}<label>{t('Mobile number','മൊബൈൽ നമ്പർ')}<input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit mobile number"/></label>{role==='admin'&&<label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>}<button disabled={busy||loading&&Boolean(token())} onClick={signIn}>{busy?t('Signing in…','കാത്തിരിക്കൂ…'):t('Continue','തുടരുക')}</button>{role!=='admin'&&<small>Private pilot login has no OTP. Use only your own details. The phone number is not verified.</small>}
 {native&&<details><summary>Backend connection</summary><label>Server URL<input type="url" placeholder="http://192.168.1.10:3000" value={backend} onChange={e=>setBackend(e.target.value)}/></label><button className="secondary" onClick={()=>{window.PickrNative?.setBackendUrl(backend);setError('');void refresh();}}>Save backend URL</button><small>For local tests, put the phone and laptop on the same Wi-Fi. Use HTTPS for hosted testing.</small></details>}
 {!native&&<nav className="chips"><a className="button secondary" href="/customer">Customer</a><a className="button secondary" href="/driver">Driver</a><a className="button secondary" href="/admin">Admin</a></nav>}</section></div>}
 {signed&&!snapshot&&<p>Loading your account…</p>}
 {snapshot&&signed&&<>

 {role==='admin'?<AdminConsole snapshot={snapshot} refresh={()=>void refresh()}/>:<>

 {view==='home'&&role==='customer'&&<CustomerHome snapshot={snapshot} active={active} onBook={voice=>{setVoice(voice);navigate('book');}} onOpenTrip={openTrip} onCheckArea={()=>void checkArea()} area={area}/>}
 {view==='home'&&role==='driver'&&<DriverDashboard snapshot={snapshot} refresh={()=>void refresh()} onOpenTrip={openTrip}/>}
 {view==='book'&&role==='customer'&&<BookingForm accountId={snapshot.account.id} requireDeviceArea={snapshot.settings.require_device_area} zones={snapshot.zones} voiceInitially={voice} onBooked={openTrip}/>}
 {view==='trip'&&!selectedTrip&&<section className="card stack" role="status"><h2>{t('Getting your trip…','യാത്രയുടെ വിവരങ്ങൾ എടുക്കുന്നു…')}</h2><p>{t('Your booking is saved. Check again or open your trips.','ബുക്കിംഗ് സേവ് ചെയ്തു. വീണ്ടും പരിശോധിക്കുക അല്ലെങ്കിൽ യാത്രകൾ തുറക്കുക.')}</p><button onClick={()=>void refresh()}>{t('Check again','വീണ്ടും പരിശോധിക്കുക')}</button><button className="secondary" onClick={()=>navigate('history')}>{t('Open trips','യാത്രകൾ തുറക്കുക')}</button></section>}
 {view==='trip'&&selectedTrip&&<TripView key={selectedTrip.id} trip={selectedTrip} role={role} settings={snapshot.settings} zones={snapshot.zones} refresh={()=>void refresh()}/>}
 {view==='history'&&<TripHistory trips={snapshot.trips} role={role} onOpenTrip={openTrip}/>}
 {view==='account'&&<AccountScreen snapshot={snapshot} role={role} onSignOut={()=>void signOut()} canLogout={canLogout} onEditVehicle={()=>navigate('vehicle')}/>}
 {view==='vehicle'&&role==='driver'&&<Onboarding allowSkips={snapshot.settings.allow_skips} current={snapshot.driver} onDone={()=>{navigate('account');void refresh();}}/>}
 {view!=='book'&&<nav className="bottom-nav" aria-label="Main navigation"><button className={view==='home'?'active':''} onClick={()=>navigate('home')}><StitchIcon name="local_shipping"/>{role==='driver'?t('Jobs','ജോലികൾ'):t('Home','ഹോം')}</button><button className={view==='history'||view==='trip'?'active':''} onClick={()=>navigate('history')}><StitchIcon name="route"/>{t('Trips','യാത്രകൾ')}</button><button className={view==='account'?'active':''} onClick={()=>navigate('account')}><StitchIcon name="badge"/>{t('Account','അക്കൗണ്ട്')}</button></nav>}
 </>}
 </>}
 {role==='driver'&&snapshot&&!snapshot.driver?.active_booking_id&&<DriverOffer offers={snapshot.offers} refresh={()=>void refresh()}/>}
 <footer><small>Thrissur pilot · real devices, real trips</small>{snapshot?.settings.support_phone&&<a href={`tel:${snapshot.settings.support_phone}`}>Call support</a>}</footer></div>;
}

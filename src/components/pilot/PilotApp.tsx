'use client';
import {useTheme} from './ThemeSwitch';
import {ReleaseNotice} from './ReleaseNotice';
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
import {useLanguage} from './Experience';
import {StitchIcon} from './StitchIcon';
import {AccountScreen} from './AccountScreen';
import {SignIn} from './design/SignIn';
import {OfflineScreen} from './design/OfflineScreen';
import {CustomerHome} from './CustomerHome';
import {TripHistory} from './TripHistory';
import {Onboarding} from './Onboarding';
export function PilotApp({role}:{role:Role}) {
 const {t}=useLanguage();useTheme();
 const shellRef=useRef<HTMLDivElement>(null);const headerRef=useRef<HTMLElement>(null);const navRef=useRef<HTMLElement>(null);const connectionRef=useRef<HTMLParagraphElement>(null);
 const refreshSequence=useRef(0);const appliedSequence=useRef(0);
 useRole(role);const [snapshot,setSnapshot]=useState<Snapshot|null>(null);const [signed,setSigned]=useState(false);const [loading,setLoading]=useState(true);const [name,setName]=useState('');const [phone,setPhone]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [view,setView]=useState<'home'|'book'|'history'|'trip'|'account'|'vehicle'>('home');const [selected,setSelected]=useState<string|null>(null);const [voice,setVoice]=useState(false);const [repeatTrip,setRepeatTrip]=useState<Trip|null>(null);const [connection,setConnection]=useState(true);const [offlineOpen,setOfflineOpen]=useState(false);const [area,setArea]=useState('');const [backend,setBackend]=useState('');const [native,setNative]=useState(false);
 const hasSnapshot=Boolean(snapshot);
 useEffect(()=>{const measure=()=>{const shell=shellRef.current;if(!shell)return;shell.style.setProperty('--pickr-header-height',`${(headerRef.current||shell.querySelector<HTMLElement>('[data-screen-header]'))?.getBoundingClientRect().height||0}px`);shell.style.setProperty('--pickr-nav-height',`${navRef.current?.getBoundingClientRect().height||0}px`);shell.style.setProperty('--pickr-connection-height',`${connectionRef.current?.getBoundingClientRect().height||0}px`);};measure();const observer=new ResizeObserver(measure);const heading=headerRef.current||shellRef.current?.querySelector<HTMLElement>('[data-screen-header]');if(heading)observer.observe(heading);if(navRef.current)observer.observe(navRef.current);if(connectionRef.current)observer.observe(connectionRef.current);return()=>observer.disconnect();},[view,signed,hasSnapshot,connection,offlineOpen]);
 const refresh=useCallback(async()=>{if(!token()){setLoading(false);return;}const sequence=++refreshSequence.current;try{const result=await requestForSession(token,()=>api<Snapshot>('snapshot'));if(result.kind==='stale'||sequence<appliedSequence.current)return;if(result.kind==='error')throw result.error;const value=result.value;appliedSequence.current=sequence;setSnapshot(value);setSigned(true);setConnection(true);setOfflineOpen(false);setError('');window.PickrNative?.configurePush(token(),apiBase());}catch(e){if([401,403].includes((e as Error & {status?:number}).status||0)){setToken('');window.PickrNative?.stopDriver();setSnapshot(null);setSigned(false);setError('Please sign in again.');}else{setError((e as Error).message);setConnection(false);}}finally{setLoading(false);}},[]);
 useEffect(()=>{setSigned(Boolean(token()));setNative(Boolean(window.PickrNative));setBackend(apiBase());void refresh();const interval=setInterval(refresh,role==='admin'?6000:3000);const focus=()=>void refresh();window.addEventListener('focus',focus);window.addEventListener('online',focus);const offline=()=>setConnection(false);window.addEventListener('offline',offline);const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);const back=(event:Event)=>{if(event.defaultPrevented||document.querySelector('[role="dialog"][aria-modal="true"]'))return;if(window.location.hash&&window.location.hash!=='#home'){event.preventDefault();window.history.back();}};window.addEventListener('pickr-back',back);const nativeEvent=(e:Event)=>{const detail=(e as CustomEvent<{error?:string}>).detail;if(detail.error)setError(detail.error);else void refresh();};window.addEventListener('pickr-native',nativeEvent);return()=>{clearInterval(interval);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);window.removeEventListener('offline',offline);window.removeEventListener('pickr-native',nativeEvent);window.removeEventListener('pickr-back',back);document.removeEventListener('visibilitychange',visible);};},[refresh,role]);
 useEffect(()=>{const read=()=>{window.scrollTo({top:0,behavior:'instant'});const [page,id]=window.location.hash.slice(1).split('/');setView(['book','history','trip','account','vehicle'].includes(page)?page as 'book'|'history'|'trip'|'account'|'vehicle':'home');if(page==='trip')setSelected(id||null);};read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 function navigate(page:'home'|'book'|'history'|'trip'|'account'|'vehicle'){window.location.hash=page==='book'?'book/0':page;setView(page);}
 async function signIn(){setBusy(true);setError('');try{const result=await api<{account:Account;token:string}>(role==='admin'?'admin/login':'login',role==='admin'?{phone,password}:{name,phone,role});setToken(result.token);setSigned(true);await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function signOut(){setError('');try{await api('logout',{});window.PickrNative?.stopDriver();if(snapshot){localStorage.removeItem(`pickr-draft-${snapshot.account.id}`);sessionStorage.removeItem(`pickr-draft-${snapshot.account.id}`);}setToken('');setSnapshot(null);setSigned(false);navigate('home');}catch(e){setError((e as Error).message);}}
 function openTrip(t:Trip){appliedSequence.current=++refreshSequence.current;setSnapshot(current=>current&&!current.trips.some(item=>item.id===t.id)?{...current,trips:[t,...current.trips]}:current);setSelected(t.id);setView('trip');window.location.hash=`trip/${t.id}`;void refresh();}
 async function checkArea(){try{const p=await currentLocation();setArea(serviceable(p,snapshot?.zones||[])?'Your device is inside an active service area.':'Your device is outside the service area. You can still book between two sites inside an active area.');}catch(e){setArea((e as Error).message);}}
 const lastDriverJob=useRef<string|null>(null);
 useEffect(()=>{const id=snapshot?.driver?.active_booking_id||null;if(role==='driver'&&id&&id!==lastDriverJob.current){setSelected(id);setView('trip');window.location.hash=`trip/${id}`;}lastDriverJob.current=id;},[snapshot,role]);
 const gpsError=useDriverTracking(snapshot?.driver,role);
 const active=snapshot?.trips.find(t=>!['CANCELLED','NO_DRIVERS'].includes(t.status)&&!(t.status==='COMPLETED'&&t.payment_status==='paid'));
 const selectedTrip=snapshot?.trips.find(t=>t.id===selected);const canLogout=!active||role==='admin';
 return <div ref={shellRef} className={`pilot-shell pickr-design ${role==='admin'?'admin-shell':`${role}-shell`} ${signed?'is-signed':'is-login'} view-${view}`}>
 <ReleaseNotice/>
 {gpsError&&!offlineOpen&&<p className="error" role="alert">{gpsError}</p>}{error&&signed&&snapshot&&!offlineOpen&&<p className="error" role="alert">{error}</p>}{signed&&snapshot&&!connection&&!offlineOpen&&<p ref={connectionRef} className="notice connection-banner" role="status">{t("Connection interrupted. Live location may be old. Reconnect before updating a trip.","ഇന്റർനെറ്റ് ലഭ്യമല്ല. സ്ഥാനം പഴയതായിരിക്കാം. യാത്രയുടെ വിവരങ്ങൾ മാറ്റുന്നതിന് മുൻപ് ഇന്റർനെറ്റ് ഓണാക്കുക.")}<button className="inline-link" onClick={()=>setOfflineOpen(true)}>{t('Connection help','കണക്ഷൻ സഹായം')}</button></p>}
 {!signed&&!loading&&<SignIn serverError={error} role={role} name={name} phone={phone} password={password} busy={busy||loading} onName={setName} onPhone={setPhone} onPassword={setPassword} onSubmit={()=>void signIn()}>{native&&<details className="backend-options"><summary>Backend connection</summary><label>Server URL<input type="url" value={backend} onChange={e=>setBackend(e.target.value)}/></label><button type="button" className="bs" onClick={()=>{window.PickrNative?.setBackendUrl(backend);setError('');void refresh();}}>Save backend URL</button><small>Use HTTPS for hosted testing, or a reachable LAN address.</small></details>}</SignIn>}
 {(signed||loading)&&!snapshot&&(connection?<section className="bd recovery-screen" role="status"><span className="empty-icon"><StitchIcon name="hourglass_empty"/></span><h1>{t('Loading your account…','അക്കൗണ്ട് തുറക്കുന്നു…')}</h1></section>:<OfflineScreen role={role} onRetry={()=>void refresh()}/>)}
 {offlineOpen&&snapshot&&<div className="offline-overlay"><OfflineScreen trip={active} role={role} onRetry={()=>void refresh()} onClose={()=>setOfflineOpen(false)}/></div>}
 {snapshot&&signed&&<>

 {role==='admin'?<AdminConsole snapshot={snapshot} refresh={()=>void refresh()} onSignOut={()=>void signOut()}/>:<>

 {view==='home'&&role==='customer'&&<CustomerHome snapshot={snapshot} active={active} onBook={voice=>{setRepeatTrip(null);setVoice(voice);navigate('book');}} onOpenTrip={openTrip} onCheckArea={()=>void checkArea()} area={area}/>}
 {view==='home'&&role==='driver'&&<DriverDashboard snapshot={snapshot} refresh={refresh} onOpenTrip={openTrip}/>}
 {view==='book'&&role==='customer'&&<BookingForm repeatTrip={repeatTrip} accountId={snapshot.account.id} requireDeviceArea={snapshot.settings.require_device_area} zones={snapshot.zones} voiceInitially={voice} onBooked={openTrip}/>}
 {view==='trip'&&!selectedTrip&&<section className="card stack" role="status"><h2>{t('Getting your trip…','യാത്രയുടെ വിവരങ്ങൾ എടുക്കുന്നു…')}</h2><p>{t('Your booking is saved. Check again or open your trips.','ബുക്കിംഗ് സേവ് ചെയ്തു. വീണ്ടും പരിശോധിക്കുക അല്ലെങ്കിൽ യാത്രകൾ തുറക്കുക.')}</p><button onClick={()=>void refresh()}>{t('Check again','വീണ്ടും പരിശോധിക്കുക')}</button><button className="secondary" onClick={()=>navigate('history')}>{t('Open trips','യാത്രകൾ തുറക്കുക')}</button></section>}
 {view==='trip'&&selectedTrip&&<TripView onRepeat={role==='customer'&&!active?()=>{setRepeatTrip(selectedTrip);setVoice(false);setView('book');window.location.hash='book/5';}:undefined} key={selectedTrip.id} trip={selectedTrip} role={role} settings={snapshot.settings} zones={snapshot.zones} refresh={()=>void refresh()} onReleased={()=>navigate('home')}/>}
 {view==='history'&&<TripHistory trips={snapshot.trips} role={role} onOpenTrip={openTrip}/>}
 {view==='account'&&<AccountScreen snapshot={snapshot} role={role} onSignOut={()=>void signOut()} canLogout={canLogout} onEditVehicle={()=>navigate('vehicle')}/>}
 {view==='vehicle'&&role==='driver'&&<Onboarding allowSkips={snapshot.settings.allow_skips} current={snapshot.driver} onDone={async()=>{await refresh();navigate('home');}}/>}
 {view!=='book'&&view!=='vehicle'&&view!=='trip'&&!(view==='home'&&role==='driver'&&(!snapshot.driver||!['approved','test'].includes(snapshot.driver.approval)))&&<nav ref={navRef} className="bottom-nav" aria-label="Main navigation"><button className={view==='home'?'active':''} onClick={()=>navigate('home')}><span className="nav-icon"><StitchIcon name={role==='driver'?'work':'home'} className={view==='home'?'fill':''}/></span><span>{role==='driver'?t('Jobs','ജോലികൾ'):t('Home','ഹോം')}</span></button><button className={view==='history'?'active':''} onClick={()=>navigate('history')}><span className="nav-icon"><StitchIcon name="receipt_long" className={view==='history'?'fill':''}/></span><span>{t('Trips','യാത്രകൾ')}</span></button><button className={view==='account'?'active':''} onClick={()=>navigate('account')}><span className="nav-icon"><StitchIcon name="person" className={view==='account'?'fill':''}/></span><span>{t('Account','അക്കൗണ്ട്')}</span></button></nav>}
 </>}
 </>}
 {role==='driver'&&snapshot&&!snapshot.driver?.active_booking_id&&<DriverOffer offers={snapshot.offers} refresh={()=>void refresh()}/>}
 </div>;
}

'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/pilot/client';
import type {Snapshot} from '@/lib/pilot/model';
import {RoadReportsAdmin} from './RoadReports';
import {StitchIcon as Icon} from './StitchIcon';
import {Notice} from './design/Primitives';
import {ServiceAreas} from './admin/ServiceAreas';
import {ConfirmProvider} from './admin/ConfirmProvider';
import {People} from './admin/People';
import {Drivers} from './admin/Drivers';
import {TripOperations} from './admin/TripOperations';
import {PilotSettings,SystemHealth} from './admin/SettingsHealth';
import type {AdminData} from './admin/types';
const sections=[['operations','Trips','monitoring','Live operations'],['boundaries','Service areas','map','Service areas'],['drivers','Drivers','badge','Drivers'],['accounts','People','group','People'],['ledger','Trip ledger','receipt_long','Trip ledger'],['settings','Settings','tune','Pilot settings'],['roads','Road issues','report','Road issues'],['audit','Activity','history','Activity'],['health','System health','health_and_safety','System health']];
export function AdminConsole({snapshot,refresh,onSignOut}:{snapshot:Snapshot;refresh:()=>void;onSignOut:()=>void}){
 const [tab,setTab]=useState('operations');const [menu,setMenu]=useState(false);const [data,setData]=useState<AdminData|null>(null);const [error,setError]=useState('');const [saved,setSaved]=useState('');const [busy,setBusy]=useState(false);const [updated,setUpdated]=useState('');const [auditQuery,setAuditQuery]=useState('');
 async function load(){try{setData(await api<AdminData>('admin'));setUpdated(new Date().toLocaleTimeString('en-IN'));}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();const interval=setInterval(load,10000);return()=>clearInterval(interval);},[]);
 async function mutate(body:unknown){setBusy(true);setError('');setSaved('');try{const action=body as {action:string;bookingId?:string};if(action.action==='releaseFromAdmin')await api(`bookings/${action.bookingId}/action`,{action:'RELEASE',reason:'Admin reassignment'});else await api('admin',body);await load();refresh();setSaved('Changes saved.');return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}}
 function navigate(value:string){setTab(value);setMenu(false);setSaved('');setError('');window.scrollTo({top:0,behavior:'instant'});}
 return <ConfirmProvider><div className={`admin-workspace ${menu?'menu-open':''}`} data-design-screen={`A-${tab}`}><div className="pg"><nav className="sb" aria-label="Admin sections"><div className="brand"><span className="logo"><Icon name="local_shipping" className="fill"/></span>PICKR Admin<button className="icon-button mobile-menu-close" aria-label="Close menu" onClick={()=>setMenu(false)}><Icon name="close"/></button></div>{sections.map(([value,label,icon])=><button key={value} className={`sidebar-link ${tab===value?'on':''}`} aria-current={tab===value?'page':undefined} onClick={()=>navigate(value)}><Icon name={icon} className={tab===value?'fill':''}/>{label}</button>)}<div className="sidebar-bottom"><small>{snapshot.account.name}</small><button className="sidebar-link" onClick={onSignOut}><Icon name="logout"/>Sign out</button></div></nav>{menu&&<button className="sidebar-scrim" aria-label="Close admin menu" onClick={()=>setMenu(false)}/>}
 <main className="mn"><header className="top admin-page-header"><div className="row"><button className="icon-button mobile-menu" aria-label="Open admin menu" onClick={()=>setMenu(true)}><Icon name="menu"/></button><div className="col"><h1 className="h1">{sections.find(s=>s[0]===tab)?.[3]}</h1><div className="rw"><span className={`chip ${snapshot.settings.paused?'c-a':'c-g'}`}><Icon name="location_on"/>{snapshot.settings.paused?'Bookings paused':snapshot.zones.filter(z=>z.active).map(z=>z.name).join(' · ')||'No active area'}</span><small>{updated?`Updated ${updated}`:'Loading…'}</small></div></div></div><button className="btn bs" disabled={busy} onClick={()=>{void load();refresh();}}><Icon name="refresh"/>Refresh</button></header>
 {saved&&<div role="status"><Notice tone="success">{saved}</Notice></div>}{error&&<div role="alert"><Notice tone="error">{error}</Notice></div>}
 {['operations','ledger'].includes(tab)&&<TripOperations key={tab} snapshot={snapshot} data={data} ledger={tab==='ledger'} busy={busy} mutate={mutate} refresh={refresh}/>}
 {tab==='boundaries'&&<ServiceAreas zones={snapshot.zones} busy={busy} mutate={mutate}/>}
 {tab==='drivers'&&<Drivers data={data} busy={busy} mutate={mutate}/>}
 {tab==='accounts'&&<People accounts={data?.accounts||[]} self={snapshot.account.id} busy={busy} mutate={mutate}/>}
 {tab==='settings'&&<PilotSettings value={snapshot.settings} busy={busy} pendingPush={data?.pendingPush||0} mutate={mutate}/>}
 {tab==='roads'&&<RoadReportsAdmin/>}
 {tab==='health'&&<SystemHealth pendingPush={data?.pendingPush||0}/>}
 {tab==='audit'&&<><label className="srch"><Icon name="search"/><input aria-label="Search activity" value={auditQuery} placeholder="Action or trip ID" onChange={e=>setAuditQuery(e.target.value)}/></label><div className="tbx"><table className="t"><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Trip</th><th>Details</th></tr></thead><tbody>{snapshot.events?.filter(e=>`${e.action} ${e.booking_id||''}`.toLowerCase().includes(auditQuery.toLowerCase())).map(e=><tr key={e.id}><td>{new Date(e.created_at).toLocaleString('en-IN')}</td><td className="b">{e.action}</td><td>{data?.accounts.find(a=>a.id===e.actor_id)?.name||e.actor_id||'System'}</td><td>{snapshot.trips.find(t=>t.id===e.booking_id)?.short_code||e.booking_id||'—'}</td><td><details><summary>View details</summary><pre>{JSON.stringify(e.details,null,2)}</pre></details></td></tr>)}</tbody></table>{!snapshot.events?.length&&<p className="empty-admin">No activity recorded.</p>}</div></>}
 </main></div></div></ConfirmProvider>;
}

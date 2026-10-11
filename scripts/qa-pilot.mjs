// Opt-in integration QA against a configured pilot. Only labelled QA accounts/rows are modified.
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const base=process.env.QA_BASE_URL||'https://pickr-xueh.onrender.com';
const stateFile='.local-tests/comprehensive-qa-state.json';
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)): {results:[],trips:[],actors:{}};
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const persist=()=>fs.writeFileSync(stateFile,JSON.stringify(state),{mode:0o600});
async function raw(route,actor,body,method){const r=await fetch(`${base}/api/${route}`,{method:method||(body?'POST':'GET'),headers:{...(state.actors[actor]?{Authorization:`Bearer ${state.actors[actor].token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(55000)});let j;try{j=await r.json();}catch{j={error:'Non-JSON response'};}return {status:r.status,data:j.data,error:j.error};}
async function call(route,actor,body,method){const r=await raw(route,actor,body,method);if(r.status>=400)throw Error(`${route}: ${r.status} ${r.error}`);return r.data;}
function assert(value,message='Unexpected result'){if(!value)throw Error(message);}
async function test(name,run){try{const evidence=await run();state.results.push({name,status:'PASS',evidence:evidence||'Expected response/state observed'});console.log('PASS '+name);}catch(e){state.results.push({name,status:'FAIL',evidence:e.message});console.log('FAIL '+name+': '+e.message);}persist();}
const bad=async(route,actor,body,status)=>{const r=await raw(route,actor,body);assert(r.status===status,`Expected ${status}; received ${r.status}: ${r.error}`);return r.error;};
const snap=actor=>call('snapshot',actor);
const action=(id,actor,value,extra={})=>call(`bookings/${id}/action`,actor,{action:value,...extra});
const pickup={label:'QA Bangalore pickup — NO LOAD',address:'Synthetic test site, Bengaluru',lat:12.9716,lng:77.5946};
const drop={label:'QA Bangalore delivery — NO LOAD',address:'Synthetic test site, Bengaluru',lat:12.9816,lng:77.6006};
const intake={materialId:'m_sand',quantity:1,pickup,drop,labourNeeded:false,siteAccess:'normal',notes:'QA TEST ONLY — NO REAL LOAD / PAYMENT',transitPassNo:'QA-NO-LOAD',inputMode:'manual'};
async function gps(actor,point=pickup,accuracy=5,sampledAt=new Date().toISOString()){return call('driver/position',actor,{lat:point.lat,lng:point.lng,accuracy,sampledAt});}
async function online(actor){await gps(actor);await call('driver/availability',actor,{online:true});}
async function booking(actor='customer',extra={}){const input={...intake,...extra};const q=await call('quote',actor,input);const b=await call('bookings',actor,{...input,vehicleTypeId:q.recommendedId,quoteToken:q.quoteToken,requestKey:randomUUID()});state.trips.push(b.id);state.last=b.id;persist();return b;}
async function accept(id,actor='driver'){await online(actor);return call(`offers/${id}`,actor,{action:'accept'});}
async function cleanup(){
 for(const id of state.trips){const result=await db.from('pilot_bookings').select('*').eq('id',id).single();const t=result.data;if(!t)continue;if(t.status==='COMPLETED'&&t.payment_status!=='paid')await action(id,'admin','PAY',{collectionMethod:'cash',collectionReference:'QA-NO-PAYMENT'});else if(!['COMPLETED','CANCELLED','NO_DRIVERS'].includes(t.status))await action(id,'admin','CANCEL',{reason:'QA cleanup — NO REAL LOAD'});}
 if(state.settings)await call('admin','admin',{action:'settings',...state.settings});
 if(state.zone)await call('admin','admin',{action:'zone',...state.zone,active:false});
 for(const [role,item] of Object.entries(state.actors)){if(role!=='admin')await call('admin','admin',{action:'deleteAccount',id:item.account.id});}
 if(state.reportId)await call('road-reports','admin',{id:state.reportId,status:'dismissed'});
 if(state.actors.admin)await call('logout','admin',{});
 fs.writeFileSync('artifacts/comprehensive-qa-results.json',JSON.stringify({base,completedAt:new Date().toISOString(),results:state.results,trips:state.trips,cleanup:'Original settings restored; Bangalore QA boundary inactive; QA accounts soft-deactivated and sessions revoked.'},null,2));fs.unlinkSync(stateFile);console.log('Cleanup completed.');
}
if(process.argv[2]==='cleanup'){await cleanup();process.exit(0);}
if(process.argv[2]==='init'){
 state.actors.admin=state.actors.admin||await call('admin/login',null,{phone:process.env.ADMIN_BOOTSTRAP_PHONE,password:process.env.ADMIN_BOOTSTRAP_PASSWORD});persist();
 const a=await call('admin','admin'),s=await snap('admin');assert(!a.drivers.some(d=>d.online),'Another driver is online; cannot isolate QA');assert(!s.trips.some(t=>['ACCEPTED','AT_PICKUP','IN_TRANSIT','AT_DROP'].includes(t.status)||t.status==='COMPLETED'&&t.payment_status!=='paid'),'Active work exists; settings tests cannot proceed');state.settings=s.settings;persist();
 for(const [role,phone] of [['customer','9000092011'],['customer2','9000092012'],['driver','9000092021'],['driver2','9000092022']]){assert(!a.accounts.some(x=>x.phone===phone),'QA phone collision');state.actors[role]=await call('login',null,{name:'QA OCT11 '+role,phone,role:role.startsWith('driver')?'driver':'customer'});persist();}
 await call('admin','admin',{action:'zone',name:'Bangalore — QA boundary (inactive after testing)',active:true,polygon:[[77.55,12.92],[77.65,12.92],[77.65,13.03],[77.55,13.03]]});state.zone=(await snap('admin')).zones.find(z=>z.name.startsWith('Bangalore — QA'));persist();
 for(const role of ['driver','driver2'])await call('driver/onboard',role,{vehicleTypeId:'tipper_100',vehicleNumber:role==='driver'?'QA-TEST-2021':'QA-TEST-2022',skip:true});
 console.log('Isolated Bangalore QA state ready.');process.exit(0);
}
if(process.argv[2]==='run'){
 await test('Unauthenticated snapshot rejected',()=>bad('snapshot',null,null,401));
 await test('Customer cannot access admin',()=>bad('admin','customer',null,403));
 await test('Invalid phone rejected',()=>bad('login',null,{name:'QA invalid',phone:'123',role:'customer'},400));
 await test('Inactive/outside service area quote rejected',()=>bad('quote','customer',{...intake,drop:{...drop,lat:15,lng:77}},422));
 await test('Zero/negative material quantity rejected',()=>bad('quote','customer',{...intake,quantity:0},400));
 await test('Over-capacity load requires separate loads',()=>bad('quote','customer',{...intake,quantity:100},422));
 await test('Narrow lane unsuitable load rejected',()=>bad('quote','customer',{...intake,siteAccess:'narrow'},422));
 await test('Past pickup time rejected',()=>bad('quote','customer',{...intake,scheduledFor:'2020-01-01T00:00:00.000Z'},400));
 await test('Settings pause blocks new quotes',async()=>{await call('admin','admin',{action:'settings',...state.settings,paused:true});await bad('quote','customer',intake,422);await call('admin','admin',{action:'settings',...state.settings});});
 await test('Device boundary restriction enabled/disabled',async()=>{await call('admin','admin',{action:'settings',...state.settings,require_device_area:true});await bad('quote','customer',intake,422);await call('admin','admin',{action:'settings',...state.settings});});
 await test('Settings reject invalid radius',()=>bad('admin','admin',{action:'settings',...state.settings,initial_radius_km:0},400));
 await test('Self-disable admin blocked',()=>bad('admin','admin',{action:'editAccount',id:state.actors.admin.account.id,disabled:true},400));
 await test('Degenerate boundary blocked',()=>bad('admin','admin',{action:'zone',name:'QA invalid polygon',active:true,polygon:[[77,12],[77,12],[77,12]]},400));
 await test('Bangalore boundary active and remote customer quote works',async()=>{state.quote=await call('quote','customer',intake);assert(state.quote.route.distanceKm>0);return `${state.quote.route.distanceKm} km; actual Mappls route`});
 await test('Tampered quote rejected',()=>bad('bookings','customer',{...intake,vehicleTypeId:'tipper_100',quoteToken:'bad.signature',requestKey:randomUUID()},400));
 await test('Changed intake invalidates signed quote',()=>bad('bookings','customer',{...intake,quantity:2,vehicleTypeId:'tipper_100',quoteToken:state.quote.quoteToken,requestKey:randomUUID()},409));
 await test('Stale GPS rejected',()=>bad('driver/position','driver',{lat:12.9716,lng:77.5946,accuracy:5,sampledAt:'2020-01-01T00:00:00.000Z'},400));
 await test('Future GPS rejected',()=>bad('driver/position','driver',{lat:12.9716,lng:77.5946,accuracy:5,sampledAt:new Date(Date.now()+120000).toISOString()},400));
 await test('Inaccurate GPS blocks online',async()=>{await gps('driver',pickup,500);await bad('driver/availability','driver',{online:true},422);});
 await test('Driver outside active zone blocked',async()=>{await gps('driver',{lat:15,lng:77});await bad('driver/availability','driver',{online:true},422);});
 await test('Disabling test skips blocks test driver',async()=>{await gps('driver');await call('admin','admin',{action:'settings',...state.settings,allow_skips:false});await bad('driver/availability','driver',{online:true},403);await call('admin','admin',{action:'settings',...state.settings});});
 await online('driver');await online('driver2');
 let b=await booking();
 await test('Booking idempotency returns same request',async()=>{const row=await db.from('pilot_bookings').select('request_key').eq('id',b.id).single();const duplicate=await call('bookings','customer',{...intake,vehicleTypeId:'tipper_100',quoteToken:state.quote.quoteToken,requestKey:row.data.request_key});assert(duplicate.id===b.id);});
 await test('Customer cannot create second active booking',()=>bad('bookings','customer',{...intake,vehicleTypeId:'tipper_100',quoteToken:state.quote.quoteToken,requestKey:randomUUID()},409));
 await test('Dispatch reaches both nearby drivers',async()=>{assert((await snap('driver')).offers.some(t=>t.id===b.id));assert((await snap('driver2')).offers.some(t=>t.id===b.id));});
 await test('Declined request does not return in same search',async()=>{await call(`offers/${b.id}`,'driver',{action:'decline'});assert(!(await snap('driver')).offers.some(t=>t.id===b.id));});
 await test('User cancellation during searching releases offers',async()=>{await action(b.id,'customer','CANCEL',{reason:'QA searching cancellation'});assert(!(await snap('driver2')).offers.some(t=>t.id===b.id));});
 b=await booking();await gps('driver');await gps('driver2');
 let winner='driver';
 await test('Concurrent accept: exactly one driver wins',async()=>{const r=await Promise.all(['driver','driver2'].map(a=>raw(`offers/${b.id}`,a,{action:'accept'})));assert(r.filter(x=>x.status===200).length===1);assert(r.filter(x=>x.status===409).length===1);winner=r[0].status===200?'driver':'driver2';return `Winner ${winner}; loser 409`});
 await test('Lost offer disappears after acceptance',async()=>{assert(!(await snap(winner==='driver'?'driver2':'driver')).offers.some(t=>t.id===b.id));});
 await test('Customer cannot advance driver stages',()=>bad(`bookings/${b.id}/action`,'customer',{action:'AT_PICKUP'},403));
 await test('Unrelated customer cannot modify booking',()=>bad(`bookings/${b.id}/action`,'customer2',{action:'CANCEL',reason:'QA unauthorized'},403));
 await test('Busy driver cannot edit truck or go offline',async()=>{await bad('driver/onboard',winner,{vehicleTypeId:'tipper_100',vehicleNumber:'QA-BUSY-22',skip:true},409);await bad('driver/availability',winner,{online:false},409);});
 await test('User cancellation after acceptance records fee and frees driver',async()=>{await action(b.id,'customer','CANCEL',{reason:'QA accepted cancellation'});const t=(await snap('customer')).trips.find(t=>t.id===b.id);assert(t.payload.cancellationFee===Math.min(100,Math.round(t.payload.quote.totalFare*.1)));assert(!(await snap(winner)).driver.active_booking_id);});
 b=await booking();await accept(b.id);
 await test('Driver releases accepted job; fresh search starts',async()=>{await action(b.id,'driver','RELEASE',{reason:'QA driver release'});const t=(await snap('customer')).trips.find(t=>t.id===b.id);assert(t.status==='SEARCHING'&&t.driver_id===null);assert(!(await snap('driver')).offers.some(t=>t.id===b.id));});
 await accept(b.id,'driver2');await action(b.id,'driver2','AT_PICKUP');
 await test('User cancellation at pickup is blocked',()=>bad(`bookings/${b.id}/action`,'customer',{action:'CANCEL',reason:'QA cancel pickup'},409));
 await test('Driver release at pickup allowed; timer reset',async()=>{await action(b.id,'driver2','RELEASE',{reason:'QA release pickup'});const t=(await snap('customer')).trips.find(t=>t.id===b.id);assert(t.status==='SEARCHING'&&!t.pickup_at);});
 await action(b.id,'customer','CANCEL',{reason:'QA cleanup release test'});
 b=await booking();await accept(b.id);
 await test('Out-of-order delivery rejected',()=>bad(`bookings/${b.id}/action`,'driver',{action:'AT_DROP'},409));
 await test('Early payment rejected',()=>bad(`bookings/${b.id}/action`,'driver',{action:'PAY',collectionMethod:'cash'},409));
 await action(b.id,'driver','AT_PICKUP');
 await test('Missing two photos blocks departure',()=>bad(`bookings/${b.id}/action`,'driver',{action:'IN_TRANSIT',loadPhotos:[]},409));
 await test('Foreign/unregistered photo rejected',()=>bad(`bookings/${b.id}/action`,'driver',{action:'IN_TRANSIT',loadPhotos:['not-owned.png','not-owned2.png']},400));
 const photos=[];
 await test('Private load upload and signed viewer',async()=>{const png=fs.readFileSync('artifacts/qa-load.png');for(let i=0;i<2;i++){const form=new FormData();form.set('purpose','load');form.set('file',new Blob([png],{type:'image/png'}),'qa-load.png');const r=await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+state.actors.driver.token},body:form});const j=await r.json();assert(r.ok,j.error);photos.push(j.data.path);}const view=await call('file?path='+encodeURIComponent(photos[0]),'driver');assert((await fetch(view.url)).ok);});
 await test('Unrelated user cannot view load photo',()=>bad('file?path='+encodeURIComponent(photos[0]),'customer2',null,403));
 await action(b.id,'driver','IN_TRANSIT',{loadPhotos:photos});
 await test('Customer can view assigned load photo',async()=>{assert((await call('file?path='+encodeURIComponent(photos[0]),'customer')).url);});
 await test('Driver release after loading blocked',()=>bad(`bookings/${b.id}/action`,'driver',{action:'RELEASE',reason:'QA transit release'},409));
 await test('User cancellation during transit blocked',()=>bad(`bookings/${b.id}/action`,'customer',{action:'CANCEL',reason:'QA transit cancel'},409));
 await test('GPS travel propagates to customer',async()=>{for(const p of [pickup,{lat:12.976,lng:77.597},drop])await gps('driver',p);const t=(await snap('customer')).trips.find(t=>t.id===b.id);assert(t.driver.lat===drop.lat&&t.driver.lng===drop.lng);});
 await test('Navigation refresh obtains real route/ETA',async()=>{await call(`bookings/${b.id}/navigation`,'driver',{});const t=(await snap('customer')).trips.find(t=>t.id===b.id);assert(t.navigation?.result, t.navigation?.error||'No route yet');return `${t.navigation.result.trafficMode}; ${t.navigation.result.durationMin} min`;});
 await test('Driver road report and admin review',async()=>{await call('road-reports','driver',{bookingId:b.id,lat:drop.lat,lng:drop.lng,kind:'site_access',notes:'QA report ONLY — no real road restriction'});state.reportId=(await call('road-reports','admin')).find(r=>r.notes.startsWith('QA report ONLY')).id;persist();await call('road-reports','admin',{id:state.reportId,status:'dismissed'});});
 await action(b.id,'driver','AT_DROP');
 await test('User cancellation at unloading blocked',()=>bad(`bookings/${b.id}/action`,'customer',{action:'CANCEL',reason:'QA unloading cancel'},409));
 await test('Driver release at unloading blocked',()=>bad(`bookings/${b.id}/action`,'driver',{action:'RELEASE',reason:'QA unloading release'},409));
 await action(b.id,'driver','COMPLETED');
 await test('Driver remains reserved until payment',async()=>{assert((await snap('driver')).driver.active_booking_id===b.id);});
 await test('UPI completion and duplicate PAY are idempotent',async()=>{await action(b.id,'driver','PAY',{collectionMethod:'upi',collectionReference:'QA-NO-REAL-PAYMENT'});await action(b.id,'driver','PAY',{collectionMethod:'upi',collectionReference:'QA-NO-REAL-PAYMENT'});assert(!(await snap('driver')).driver.active_booking_id);});
 await test('Completed trip feedback persisted',async()=>{await action(b.id,'customer','REVIEW',{rating:4,comment:'QA feedback only'});assert((await snap('customer')).trips.find(t=>t.id===b.id).payload.review.rating===4);});
 await test('Completed booking cannot be cancelled',()=>bad(`bookings/${b.id}/action`,'customer',{action:'CANCEL',reason:'QA finished cancel'},409));
 await test('Saved sites isolated and deletable',async()=>{const site=await call('sites','customer',pickup);assert(!(await call('sites','customer2')).some(x=>x.id===site.id));await call('sites?id='+site.id,'customer',null,'DELETE');assert(!(await call('sites','customer')).some(x=>x.id===site.id));});
 await test('Admin account rename and soft-delete',async()=>{await call('admin','admin',{action:'editAccount',id:state.actors.customer2.account.id,name:'QA OCT11 renamed customer'});assert((await call('admin','admin')).accounts.find(a=>a.id===state.actors.customer2.account.id).name.includes('renamed'));await call('admin','admin',{action:'deleteAccount',id:state.actors.customer2.account.id});await bad('snapshot','customer2',null,401);});
 await test('Admin driver reject blocks work; approval restores',async()=>{await call('admin','admin',{action:'approval',id:state.actors.driver2.account.id,approval:'rejected'});await bad('driver/availability','driver2',{online:true},403);await call('admin','admin',{action:'approval',id:state.actors.driver2.account.id,approval:'approved'});await online('driver2');});
 await test('Admin audit includes QA operations',async()=>{assert((await snap('admin')).events.some(e=>e.action==='ADMIN_ZONE'));});
 persist();console.log('QA run complete; state retained for Android/browser checks before cleanup.');
}
if(process.argv[2]==='extended'){
 await online('driver');await online('driver2');let b=await booking();await accept(b.id);
 await test('Retest cancellation fee after migration',async()=>{await action(b.id,'customer','CANCEL',{reason:'QA fee regression retest'});const t=(await snap('customer')).trips.find(t=>t.id===b.id);assert(t.payload.cancellationFee===Math.min(100,Math.round(t.payload.quote.totalFare*.1)));assert(!(await snap('driver')).driver.active_booking_id);return 'Original FAIL fixed: cancellationFee persisted and reservation released';});
 await test('Older in-window GPS cannot overwrite latest sample',async()=>{await gps('driver',drop);await gps('driver',pickup,5,new Date(Date.now()-20000).toISOString());assert((await snap('driver')).driver.lat===drop.lat);});
 await test('Invalid uploaded file rejected',async()=>{const form=new FormData();form.set('purpose','load');form.set('file',new Blob(['not an image']),'qa.txt');const r=await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+state.actors.driver.token},body:form});assert(r.status===400);});
 await test('Customer cannot upload driver documents',async()=>{const form=new FormData();form.set('purpose','document');form.set('file',new Blob([fs.readFileSync('artifacts/qa-load.png')],{type:'image/png'}),'qa.png');const r=await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+state.actors.customer.token},body:form});assert(r.status===403);});
 await test('Full onboarding requires measurements/documents',()=>bad('driver/onboard','driver2',{vehicleTypeId:'tipper_100',vehicleNumber:'QA-TEST-2022',skip:false},400));
 await test('Four-document onboarding and admin approval',async()=>{const documents={};for(const key of ['registration','rc','license','aadhaar']){const form=new FormData();form.set('purpose','document');form.set('file',new Blob([fs.readFileSync('artifacts/qa-load.png')],{type:'image/png'}),'qa-document.png');const r=await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+state.actors.driver2.token},body:form});const j=await r.json();assert(r.ok,j.error);documents[key]=j.data.path;}await call('driver/onboard','driver2',{vehicleTypeId:'tipper_100',vehicleNumber:'QA-TEST-2022',skip:false,routingProfile:{height:3,width:2.2,length:6,weight:9,axle_load:5},documents});assert((await snap('driver2')).driver.approval==='pending');await bad('file?path='+encodeURIComponent(documents.rc),'customer',null,403);await call('admin','admin',{action:'approval',id:state.actors.driver2.account.id,approval:'approved'});return 'Four synthetic files stored privately; pending → approved; customer denied document access';});
 await test('Admin creates/edits/deactivates account',async()=>{const phone='9000092031';await call('admin','admin',{action:'createAccount',name:'QA OCT11 Admin-created customer',phone,role:'customer'});const item=(await call('admin','admin')).accounts.find(a=>a.phone===phone);assert(item);await call('admin','admin',{action:'editAccount',id:item.id,name:'QA OCT11 Edited admin-created customer'});await call('admin','admin',{action:'deleteAccount',id:item.id});assert((await call('admin','admin')).accounts.find(a=>a.id===item.id).disabled);});
 await test('Location search provider access',async()=>{const r=await raw('geocode?q=Bengaluru','customer');if(r.status>=400)throw Error(`${r.status}: ${r.error}`);assert(r.data.length>0);});
 await test('Voice typed intake service',async()=>{const parsed=await call('voice/parse','customer',{transcript:'I need one load of M-sand',currentSlots:{}});assert(parsed.material==='m_sand'&&parsed.quantity===1);return `Parsed material and quantity; next question ${parsed.nextQuestion?.slot}`});
 await call('driver/availability','driver',{online:false});await call('driver/availability','driver2',{online:false});
 b=await booking();
 await test('Five search rounds and timeout (isolated clock simulation)',async()=>{for(let minute=1;minute<=5;minute++){const back=new Date(Date.now()-(minute*60+2)*1000).toISOString();const {error}=await db.from('pilot_bookings').update({search_started_at:back,payload:{...b.payload,scheduledFor:back}}).eq('id',b.id).eq('customer_id',state.actors.customer.account.id);assert(!error,error?.message);await db.rpc('pilot_dispatch');const t=(await snap('customer')).trips.find(t=>t.id===b.id);if(minute<5)assert(t.status==='SEARCHING'&&t.radius_km===state.settings.initial_radius_km+minute*state.settings.radius_step_km,`minute ${minute}: ${t.status}, radius ${t.radius_km}`);else assert(t.status==='NO_DRIVERS');}return 'QA booking clock advanced through 1–5 minutes; dispatcher ran each round';});
 await test('Customer can retry a timed-out search',async()=>{await action(b.id,'customer','RETRY');assert((await snap('customer')).trips.find(t=>t.id===b.id).status==='SEARCHING');await action(b.id,'customer','CANCEL',{reason:'QA timeout retry cleanup'});});
 b=await booking('customer',{scheduledFor:new Date(Date.now()+3600000).toISOString()});await online('driver');
 await test('Future scheduled trip not dispatched early',async()=>{assert(!(await snap('driver')).offers.some(t=>t.id===b.id));await action(b.id,'customer','CANCEL',{reason:'QA scheduled cleanup'});});
 await call('driver/availability','driver',{online:false});await online('driver2');
 b=await booking();
 await test('Admin can assign matching available driver',async()=>{await call('admin','admin',{action:'assign',bookingId:b.id,driverId:state.actors.driver2.account.id});assert((await snap('customer')).trips.find(t=>t.id===b.id).driver_id===state.actors.driver2.account.id);await action(b.id,'admin','CANCEL',{reason:'QA manual dispatch cleanup'});});
 await call('driver/availability','driver2',{online:false});persist();console.log('Extended tests complete.');
}

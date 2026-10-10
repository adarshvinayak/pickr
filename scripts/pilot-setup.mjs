import {readFile,writeFile,chmod} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {setDefaultResultOrder} from 'node:dns';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {createClient} from '@supabase/supabase-js';
import {connectDatabase,migrate,bootstrapAdmin,installCron} from './pilot-database.mjs';
// Use the same public IPv4 path as pilot:start and the cloud key allowlist.
setDefaultResultOrder('ipv4first');
const root=new URL('../',import.meta.url);const envPath=new URL('.env.local',root);
const placeholder=value=>!value||/your-|replace-with|choose-a|YOUR-PASSWORD/.test(value);
try{
 let source;try{source=await readFile(envPath,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;source=await readFile(new URL('.env.local.example',root),'utf8');await writeFile(envPath,source,{mode:0o600,flag:'wx'});}
 process.loadEnvFile(fileURLToPath(envPath));
 for(const key of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','DATABASE_SSL_CA_FILE','MAPPLS_REST_KEY','MAPPLS_WEB_KEY','ADMIN_BOOTSTRAP_PHONE','PUBLIC_APP_URL','PICKR_BACKEND_URL'])if(!new RegExp(`^${key}=.*$`,'m').test(source))source+=`\n${key}=${key==='PUBLIC_APP_URL'?'http://localhost:3000':''}\n`;
 for(const key of ['QUOTE_SIGNING_SECRET','WORKER_SECRET','ADMIN_BOOTSTRAP_PASSWORD'])if(placeholder(process.env[key])){
  const value=randomBytes(32).toString('hex');const line=`${key}=${value}`;const pattern=new RegExp(`^${key}=.*$`,'m');source=pattern.test(source)?source.replace(pattern,line):`${source}\n${line}\n`;process.env[key]=value;
 }
 await writeFile(envPath,source,{mode:0o600});await chmod(envPath,0o600);
 const required=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','MAPPLS_REST_KEY','MAPPLS_WEB_KEY','ADMIN_BOOTSTRAP_PHONE'];
 const missing=required.filter(key=>placeholder(process.env[key]));
 if(missing.length)throw new Error(`Fill these values in .env.local: ${missing.join(', ')}. Private signing/worker/admin secrets have been generated; they are not printed.`);
 const db=await connectDatabase();try{
  await migrate(db,root);console.log(await bootstrapAdmin(db,process.env.ADMIN_BOOTSTRAP_PHONE,process.env.ADMIN_BOOTSTRAP_PASSWORD)?'Created first admin.':'Existing admin preserved; password unchanged.');
  try{await installCron(db,root);console.log('Installed ten-second dispatch Cron.');}catch{console.log('Cron unavailable. npm run pilot:start includes a dispatch worker so dispatch continues without open screens.');}
 }finally{await db.end();}
 const api=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 // PostgREST schema reload is asynchronous after the first migration commit.
 let settings;for(let attempt=0;attempt<4;attempt++){settings=await api.from('pilot_settings').select('id,require_device_area').single();if(!settings.error)break;if(attempt<3)await delay(1500);}
 if(settings.error)throw new Error('SQL applied, but Supabase Data API cannot read settings. Check that the URL/key belong to this project and retry after schema cache reload.');
 const bucket=await api.storage.getBucket('pilot-private');if(bucket.error||bucket.data.public)throw new Error('Private upload bucket verification failed. Check Storage configuration.');
 console.log('Supabase Data API and private storage bucket verified.');
 const mapUrl=new URL('https://search.mappls.com/search/address/geocode');mapUrl.search=new URLSearchParams({address:'Thrissur, Kerala',itemCount:'1',access_token:process.env.MAPPLS_REST_KEY}).toString();
 const map=await fetch(mapUrl,{signal:AbortSignal.timeout(15000)});const result=await map.json();const place=Array.isArray(result.copResults)?result.copResults[0]:result.copResults;if(!map.ok||!place)throw new Error('Mappls geocoding check failed. Verify REST key/account access.');
 const eloc=place.eLoc||place.eloc;if(!eloc||!/^[a-z0-9]{6}$/i.test(eloc))throw new Error('Mappls did not return a valid place identifier.');
 const detailUrl=new URL(`https://place.mappls.com/O2O/entity/place-details/${eloc}`);detailUrl.search=new URLSearchParams({access_token:process.env.MAPPLS_REST_KEY}).toString();
 const detail=await fetch(detailUrl,{signal:AbortSignal.timeout(15000)});const location=await detail.json();if(!detail.ok||location.latitude==null||location.longitude==null||!Number.isFinite(Number(location.latitude))||!Number.isFinite(Number(location.longitude)))console.log('Address-search coordinates unavailable. Pilot can use exact map pins or device GPS; address search needs Place Details Location Coordinates access.');
 else console.log('Mappls geocoding and coordinate access verified.');
 const mode=process.env.MAPPLS_ROUTING_MODE||'standard';if(!['standard','predictive'].includes(mode))throw new Error('MAPPLS_ROUTING_MODE must be standard or predictive.');
 for(const profile of ['driving','trucking']){
  const routeUrl=new URL(mode==='standard'?`https://route.mappls.com/route/direction/route_eta/${profile}/76.2144,10.5276;76.22,10.53`:'https://route.mappls.com/routev2/direction/route');
  routeUrl.search=new URLSearchParams(mode==='standard'?{access_token:process.env.MAPPLS_REST_KEY,geometries:'geojson',steps:'true'}:{access_token:process.env.MAPPLS_REST_KEY,locations:'76.2144,10.5276;76.22,10.53',profile,speedTypes:'traffic',date_time:'0,""'}).toString();
  const route=await fetch(routeUrl,{signal:AbortSignal.timeout(15000)});const road=await route.json();
  const valid=mode==='standard'?road.code==='Ok'&&road.routes?.[0]?.geometry?.coordinates?.length>=2:road.trip?.legs?.length;
  if(!route.ok||!valid)throw new Error(`Mappls ${mode} ${profile} routing check failed. Verify access for the selected routing mode.`);
  console.log(`Mappls ${mode} ${profile} route endpoint verified.`);
 }
 const sdk=await fetch(`https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${encodeURIComponent(process.env.MAPPLS_WEB_KEY)}`,{headers:{Referer:'https://appassets.androidplatform.net/assets/public/index.html',Origin:'https://appassets.androidplatform.net'},signal:AbortSignal.timeout(15000)});if(!sdk.ok)throw new Error('Mappls SDK key check failed. Verify web maps entitlement.');await sdk.text();
 console.log('Mappls traffic routing and SDK endpoint verified. Browser/WebView map rendering must still be verified on devices. Standard mode does not apply measured truck restrictions, future traffic predictions or incident avoidance.');
 console.log('Setup complete. Start: npm run pilot:start. Build preconfigured APKs: npm run android:build.');
}catch(error){
 let message=error.message;for(const key of ['DATABASE_URL','SUPABASE_SERVICE_ROLE_KEY','MAPPLS_REST_KEY','MAPPLS_WEB_KEY','ADMIN_BOOTSTRAP_PASSWORD','QUOTE_SIGNING_SECRET','WORKER_SECRET'])if(process.env[key])message=message.replaceAll(process.env[key],'[redacted]');
 console.error(`Setup stopped: ${message}`);process.exitCode=1;
}

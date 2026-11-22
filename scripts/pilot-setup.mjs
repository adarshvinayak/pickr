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
 for(const key of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','DATABASE_SSL_CA_FILE','GOOGLE_MAPS_SERVER_KEY','GOOGLE_MAPS_WEB_KEY','ADMIN_BOOTSTRAP_PHONE','PUBLIC_APP_URL','PICKR_BACKEND_URL'])if(!new RegExp(`^${key}=.*$`,'m').test(source))source+=`\n${key}=${key==='PUBLIC_APP_URL'?'http://localhost:3000':''}\n`;
 for(const key of ['QUOTE_SIGNING_SECRET','WORKER_SECRET','ADMIN_BOOTSTRAP_PASSWORD'])if(placeholder(process.env[key])){
  const value=randomBytes(32).toString('hex');const line=`${key}=${value}`;const pattern=new RegExp(`^${key}=.*$`,'m');source=pattern.test(source)?source.replace(pattern,line):`${source}\n${line}\n`;process.env[key]=value;
 }
 await writeFile(envPath,source,{mode:0o600});await chmod(envPath,0o600);
 const required=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','GOOGLE_MAPS_SERVER_KEY','GOOGLE_MAPS_WEB_KEY','ADMIN_BOOTSTRAP_PHONE'];
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
 const gKey=process.env.GOOGLE_MAPS_SERVER_KEY;
 async function google(label,url,init,ok){let response;try{response=await fetch(url,{signal:AbortSignal.timeout(15000),...init});}catch{throw new Error(`${label} check failed: Google Maps is unreachable.`);}const body=await response.json().catch(()=>({}));if(!response.ok||!ok(body))throw new Error(`${label} check failed (${body.error?.message||body.status||response.status}). Enable that API, billing and key access in Google Cloud.`);console.log(`${label} verified.`);}
 await google('Google Places search','https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'content-type':'application/json','X-Goog-Api-Key':gKey,'X-Goog-FieldMask':'places.id,places.location'},body:JSON.stringify({textQuery:'Thrissur, Kerala',regionCode:'IN',maxResultCount:1})},body=>Number.isFinite(body.places?.[0]?.location?.latitude));
 await google('Google Geocoding (address lookup)',`https://maps.googleapis.com/maps/api/geocode/json?latlng=10.5276,76.2144&key=${encodeURIComponent(gKey)}`,{},body=>body.status==='OK');
 await google('Google Routes (traffic-aware driving)','https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'content-type':'application/json','X-Goog-Api-Key':gKey,'X-Goog-FieldMask':'routes.distanceMeters,routes.polyline.encodedPolyline'},body:JSON.stringify({origin:{location:{latLng:{latitude:10.5276,longitude:76.2144}}},destination:{location:{latLng:{latitude:10.53,longitude:76.22}}},travelMode:'DRIVE',routingPreference:'TRAFFIC_AWARE'})},body=>body.routes?.[0]?.polyline?.encodedPolyline);
 console.log('Google server APIs verified. The browser web key (Maps JavaScript API) can only be checked in a browser: open /customer and confirm the map loads. Allow your site origin and https://appassets.androidplatform.net in the key\'s website restrictions. Google routing is general driving: it does not apply truck dimensions or avoid reported closures.');
 console.log('Setup complete. Start: npm run pilot:start. Build preconfigured APKs: npm run android:build.');
}catch(error){
 let message=error.message;for(const key of ['DATABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GOOGLE_MAPS_SERVER_KEY','GOOGLE_MAPS_WEB_KEY','ADMIN_BOOTSTRAP_PASSWORD','QUOTE_SIGNING_SECRET','WORKER_SECRET'])if(process.env[key])message=message.replaceAll(process.env[key],'[redacted]');
 console.error(`Setup stopped: ${message}`);process.exitCode=1;
}

import {readFile} from 'node:fs/promises';
import {createHash,randomBytes,scryptSync} from 'node:crypto';
import pg from 'pg';

export const migrations=['20261010000000_real_pilot.sql','20261010010000_pilot_guards.sql','20261010020000_mappls_navigation.sql','20261011000000_release_before_loading.sql','20261011010000_record_cancellation_fee.sql'];
export function connectionOptions(connectionString,ca){
 const url=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
 if(url.port==='6543')throw new Error('Use a direct or session-pooler connection, not transaction pooler port 6543.');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);
 return {connectionString:url.toString(),ssl:local?false:{rejectUnauthorized:true,...(ca?{ca}:{})},connectionTimeoutMillis:15000};
}
export async function connectDatabase(env=process.env){
 if(!env.DATABASE_URL)throw new Error('Set DATABASE_URL to apply migrations. The Supabase API key cannot execute SQL.');
 const ca=env.DATABASE_SSL_CA_FILE?await readFile(env.DATABASE_SSL_CA_FILE,'utf8'):undefined;
 const client=new pg.Client(connectionOptions(env.DATABASE_URL,ca));await client.connect();return client;
}
export async function migrate(client,root,log=console.log){
 await client.query('BEGIN');
 try{
  await client.query("select pg_advisory_xact_lock(724319601)");
  await client.query('create schema if not exists pickr_internal; revoke all on schema pickr_internal from public,anon,authenticated; create table if not exists pickr_internal.migrations(name text primary key,checksum text not null,applied_at timestamptz not null default now()); revoke all on pickr_internal.migrations from public,anon,authenticated');
  for(const name of migrations){
   const source=await readFile(new URL(`supabase/migrations/${name}`,root),'utf8');const checksum=createHash('sha256').update(source).digest('hex');
   const previous=await client.query('select checksum from pickr_internal.migrations where name=$1',[name]);
   if(previous.rowCount){if(previous.rows[0].checksum!==checksum)throw new Error(`Applied migration ${name} changed. Add a new migration instead.`);log(`Already applied: ${name}`);continue;}
   const marker=migrations.indexOf(name)>2?null:name===migrations[0]?'public.pilot_accounts':name===migrations[1]?'public.pilot_rate_limits':'public.pilot_navigation';
   if(marker&&(await client.query('select to_regclass($1) as existing',[marker])).rows[0].existing)throw new Error(`Untracked existing pilot schema (${marker}). Do not replay migrations. Compare the existing schema with the supplied migrations before recording it in pickr_internal.migrations.`);
   await client.query(source);await client.query('insert into pickr_internal.migrations(name,checksum) values($1,$2)',[name,checksum]);log(`Applied: ${name}`);
  }
  await client.query("NOTIFY pgrst, 'reload schema'");await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}
}
export async function bootstrapAdmin(client,phone,password){
 if(!/^[6-9]\d{9}$/.test(phone||'')||(password||'').length<10)throw new Error('Set a valid 10-digit ADMIN_BOOTSTRAP_PHONE and ADMIN_BOOTSTRAP_PASSWORD of at least 10 characters.');
 const salt=randomBytes(16).toString('hex');const hash=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
 await client.query('BEGIN');try{
  await client.query('select pg_advisory_xact_lock(724319602)');
  const count=await client.query("select count(*)::int as count from public.pilot_accounts where role='admin'");
  if(count.rows[0].count){await client.query('COMMIT');return false;}
  await client.query("insert into public.pilot_accounts(name,phone,role,password_hash) values('Pilot Admin',$1,'admin',$2)",[phone,hash]);await client.query('COMMIT');return true;
 }catch(error){await client.query('ROLLBACK');throw error;}
}
export async function installCron(client,root){await client.query(await readFile(new URL('supabase/pilot-cron.sql',root),'utf8'));}

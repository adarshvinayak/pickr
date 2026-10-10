// Disposable PostgreSQL verification of the actual setup/migration code, not production.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir,userInfo} from 'node:os';
import {pathToFileURL} from 'node:url';
import {randomUUID,scryptSync} from 'node:crypto';
import pg from 'pg';
import {connectionOptions,migrate,bootstrapAdmin,migrations} from './pilot-database.mjs';
const root=new URL('../',import.meta.url);
const url=process.env.POSTGRES_TEST_URL||`postgresql://${encodeURIComponent(userInfo().username)}@127.0.0.1:5432/postgres`;
const name=`pickr_setup_test_${randomUUID().replaceAll('-','')}`;
const admin=new pg.Client(connectionOptions(url));let db;let temp;
try{
 await admin.connect();await admin.query(`create database ${name}`);
 const target=new URL(url);target.pathname=`/${name}`;db=new pg.Client(connectionOptions(target.toString()));await db.connect();
 await db.query("do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon;end if;if not exists(select from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select from pg_roles where rolname='service_role') then create role service_role;end if;end $$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[])");
 temp=await mkdtemp(`${tmpdir()}/pickr-migrations-`);const fixture=pathToFileURL(`${temp}/`);await mkdir(new URL('supabase/migrations/',fixture),{recursive:true});
 for(const file of migrations)await writeFile(new URL(`supabase/migrations/${file}`,fixture),await readFile(new URL(`supabase/migrations/${file}`,root)));
 const second=new URL(`supabase/migrations/${migrations[1]}`,fixture);const original=await readFile(second,'utf8');await writeFile(second,`${original}\nselect from;`);
 await assert.rejects(migrate(db,fixture,()=>{}));assert.equal((await db.query("select to_regclass('public.pilot_accounts') as table")).rows[0].table,null);
 await writeFile(second,original);await migrate(db,fixture,()=>{});await migrate(db,fixture,()=>{});
 assert.equal((await db.query('select count(*)::int as count from pickr_internal.migrations')).rows[0].count,migrations.length);
 const phone='9000000000',password=randomUUID();assert.equal(await bootstrapAdmin(db,phone,password),true);assert.equal(await bootstrapAdmin(db,phone,randomUUID()),false);
 const hash=(await db.query("select password_hash from pilot_accounts where role='admin'")).rows[0].password_hash;const [salt,encoded]=hash.split(':');assert.equal(scryptSync(password,salt,64).toString('hex'),encoded);
 assert.equal((await db.query("select count(*)::int as count from pilot_accounts")).rows[0].count,1);
 await db.query('set role anon');await assert.rejects(db.query('select * from pickr_internal.migrations'));await db.query('reset role');
 await writeFile(second,`${original}\n-- changed historical migration`);await assert.rejects(migrate(db,fixture,()=>{}),/changed/);
 assert.equal((await db.query('select count(*)::int as count from pickr_internal.migrations')).rows[0].count,migrations.length);
 console.log('PASS: setup migrations apply atomically, rerun safely, detect edited history, create one hashed admin without resetting it, and keep migration records private.');
}finally{
 if(db)await db.end();try{await admin.query(`drop database if exists ${name}`);}finally{await admin.end();}
 if(temp)await rm(temp,{recursive:true,force:true});
}

#!/usr/bin/env python3
"""Real PostgreSQL integration checks in a new, disposable database. Never uses production credentials."""
import subprocess, json, uuid, os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
root=Path(__file__).resolve().parents[1]
name='pickr_test_'+uuid.uuid4().hex[:12]
binpath=os.environ.get('POSTGRES_BIN','/opt/homebrew/opt/postgresql@17/bin')
psql=str(Path(binpath)/'psql')
def sql(query,ok=True):
 r=subprocess.run([psql,'-X','-At','-v','ON_ERROR_STOP=1','-d',name,'-c',query],capture_output=True,text=True)
 if ok and r.returncode:raise AssertionError(r.stderr)
 return r
ids={k:str(uuid.uuid4()) for k in ['customer','other','admin','driver1','driver2','driver3','booking','booking2','booking3','booking4']}
def expect_error(query,part):
 r=sql(query,False);assert r.returncode and part in r.stderr,r.stdout+r.stderr
try:
 subprocess.run([str(Path(binpath)/'createdb'),name],check=True)
 sql("do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon;end if;if not exists(select from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select from pg_roles where rolname='service_role') then create role service_role;end if;end $$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);")
 migration=root/'supabase/migrations/20261010000000_real_pilot.sql'
 subprocess.run([psql,'-X','-v','ON_ERROR_STOP=1','-d',name,'-f',str(migration)],check=True,stdout=subprocess.DEVNULL)
 subprocess.run([psql,'-X','-v','ON_ERROR_STOP=1','-d',name,'-f',str(root/'supabase/migrations/20261010010000_pilot_guards.sql')],check=True,stdout=subprocess.DEVNULL)
 subprocess.run([psql,'-X','-v','ON_ERROR_STOP=1','-d',name,'-f',str(root/'supabase/migrations/20261010020000_mappls_navigation.sql')],check=True,stdout=subprocess.DEVNULL)
 for k,role in [('customer','customer'),('other','customer'),('admin','admin'),('driver1','driver'),('driver2','driver'),('driver3','driver')]:
  sql(f"insert into pilot_accounts(id,name,phone,role) values('{ids[k]}','{k}','{k}','{role}');")
 for k in ['driver1','driver2','driver3']:
  sql(f"insert into pilot_drivers(id,vehicle_type_id,vehicle_number,approval,online,lat,lng,accuracy,position_at,device_at) values('{ids[k]}','tata_ace','{k}','test',true,10.5276,76.2144,10,now(),now());")
 payload=json.dumps({'vehicleTypeId':'tata_ace','scheduledFor':'2026-01-01T00:00:00Z','pickup':{'lat':10.5276,'lng':76.2144,'label':'pickup'},'drop':{'lat':10.53,'lng':76.22,'label':'drop'}})
 def book(key,customer='customer'):
  sql(f"insert into pilot_bookings(id,short_code,customer_id,payload,request_key) values('{ids[key]}','{key}','{ids[customer]}','{payload}','{uuid.uuid4()}');")
 def accept(driver,booking='booking'):
  return f"select (pilot_accept('{ids[booking]}','{ids[driver]}')).status;"
 def transition(action,driver,booking='booking',patch='{}'):
  return f"select (pilot_transition('{ids[booking]}','{ids[driver]}','{action}','{patch}')).status;"
 book('booking');sql('select pilot_dispatch();')
 assert sql('select count(*) from pilot_offers;').stdout.strip()=='3'
 sql(f"update pilot_offers set response='declined' where driver_id='{ids['driver3']}';select pilot_dispatch();")
 expect_error(accept('driver3'),'No eligible offer')
 with ThreadPoolExecutor(max_workers=2) as pool:
  results=list(pool.map(lambda d:sql(accept(d),False),['driver1','driver2']))
 assert sum(r.returncode==0 for r in results)==1,[r.stderr for r in results]
 winner='driver1' if results[0].returncode==0 else 'driver2';loser='driver2' if winner=='driver1' else 'driver1'
 assert 'ALREADY_TAKEN' in results[1 if winner=='driver1' else 0].stderr
 # Shared route leases: one provider request, stale assignments cannot overwrite newer routes.
 claim=f"select pilot_navigation_claim('{ids['booking']}','ACCEPTED','{ids[winner]}',false);"
 with ThreadPoolExecutor(max_workers=2) as pool:
  leases=list(pool.map(lambda _:sql(claim).stdout.strip(),range(2)))
 assert sum(bool(lease) for lease in leases)==1,leases
 lease=next(l for l in leases if l)
 assert sql(f"select pilot_navigation_finish('{ids['booking']}','{lease}','ACCEPTED','{ids[winner]}','{{\"durationMin\":4}}',null);").stdout.strip()=='t'
 assert sql(claim).stdout.strip()=='' # ordinary polling does not spend another request
 sql(f"update pilot_navigation set next_at=now()-interval '1 second' where booking_id='{ids['booking']}';")
 second=sql(claim).stdout.strip();assert second
 assert sql(f"select pilot_navigation_finish('{ids['booking']}','{second}','ACCEPTED','{ids[winner]}',null,'Provider offline');").stdout.strip()=='t'
 assert json.loads(sql(f"select result from pilot_navigation where booking_id='{ids['booking']}';").stdout.strip())['durationMin']==4
 assert sql(f"select pilot_navigation_finish('{ids['booking']}','{lease}','ACCEPTED','{ids[winner]}','{{}}',null);").stdout.strip()=='f'
 expect_error(f"update pilot_drivers set routing_profile='{{}}' where id='{ids[winner]}';",'DRIVER_BUSY')
 expect_error(transition('AT_DROP',winner),'INVALID_STAGE')
 expect_error(transition('AT_PICKUP','other'),'FORBIDDEN')
 expect_error(transition('PAY',winner,patch='{"collectionMethod":"cash"}'),'INVALID_STAGE')
 book('booking2','other');sql('select pilot_dispatch();')
 assert sql(f"select count(*) from pilot_offers where booking_id='{ids['booking2']}' and driver_id='{ids[winner]}';").stdout.strip()=='0'
 expect_error(accept(winner,'booking2'),'DRIVER_BUSY')
 sql(transition('AT_PICKUP',winner));assert sql(f"select pilot_navigation_finish('{ids['booking']}','{second}','ACCEPTED','{ids[winner]}','{{}}',null);").stdout.strip()=='f';expect_error(transition('IN_TRANSIT',winner),'two load photos')
 sql('update pilot_settings set allow_skips=false;');expect_error(transition('IN_TRANSIT',winner,patch='{"photosSkipped":true}'),'two load photos')
 sql('update pilot_settings set allow_skips=true;');sql(transition('IN_TRANSIT',winner,patch='{"photosSkipped":true}'));sql(transition('AT_DROP',winner));sql(transition('COMPLETED',winner))
 assert sql(f"select active_booking_id is not null from pilot_drivers where id='{ids[winner]}';").stdout.strip()=='t'
 sql(transition('PAY',winner,patch='{"collectionMethod":"cash"}'))
 assert sql(f"select active_booking_id is null from pilot_drivers where id='{ids[winner]}';").stdout.strip()=='t'
 sql(transition('PAY',winner,patch='{"collectionMethod":"cash"}')) # collection is idempotent
 sql(f"update pilot_bookings set search_started_at=now()-interval '61 seconds' where id='{ids['booking2']}';select pilot_dispatch();")
 assert sql(f"select radius_km from pilot_bookings where id='{ids['booking2']}';").stdout.strip()=='10'
 sql(f"update pilot_bookings set search_started_at=now()-interval '301 seconds' where id='{ids['booking2']}';select pilot_dispatch();")
 assert sql(f"select status from pilot_bookings where id='{ids['booking2']}';").stdout.strip()=='NO_DRIVERS'
 sql(transition('RETRY','other','booking2'));assert sql(f"select count(*) from pilot_offers where booking_id='{ids['booking2']}';").stdout.strip()=='0'
 sql('select pilot_dispatch();')
 # Stale locations cannot win, even with an earlier offer.
 sql(f"update pilot_drivers set position_at=now()-interval '2 minutes' where id='{ids[loser]}';")
 expect_error(accept(loser,'booking2'),'location is stale')
 assert sql("select has_function_privilege('anon','pilot_accept(uuid,uuid,uuid)','execute');").stdout.strip()=='f'
 assert sql("select has_table_privilege('anon','pilot_accounts','select');").stdout.strip()=='f'
 assert sql("select has_table_privilege('anon','pilot_navigation','select');").stdout.strip()=='f'
 assert sql("select has_table_privilege('anon','pilot_road_reports','select');").stdout.strip()=='f'
 assert sql("select has_function_privilege('anon','pilot_navigation_claim(uuid,text,uuid,boolean)','execute');").stdout.strip()=='f'
 assert sql("select pilot_inside(10.45,76.12,'[[76.12,10.45],[76.3,10.45],[76.3,10.62],[76.12,10.62]]');").stdout.strip()=='t'
 sql(f"select pilot_account_edit('{ids['admin']}','{ids[loser]}','{{\"disabled\":true}}');")
 assert sql(f"select disabled from pilot_accounts where id='{ids[loser]}';").stdout.strip()=='t'
 assert sql("select pilot_login_limit('test-key',1);").stdout.strip()=='t'
 assert sql("select pilot_login_limit('test-key',1);").stdout.strip()=='f'
 print('PASS: migration, real concurrent first-winner race, busy driver exclusion, stage/ownership checks, photo/skip enforcement, payment reservation/idempotency, radius/expiry/retry, stale GPS, shared route leases, cached outage estimates, stage invalidation, frozen measurements and private privileges.')
finally:
 subprocess.run([str(Path(binpath)/'dropdb'),'--if-exists',name],check=False)

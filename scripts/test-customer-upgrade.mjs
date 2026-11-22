import assert from 'node:assert/strict';import {connectDatabase} from './pilot-database.mjs';import {randomUUID} from 'node:crypto';
const db=await connectDatabase();await db.query('begin');try{
await db.query("insert into pilot_zones(name,active,polygon)values('QA rollback zone',true,'[[76,10],[77,10],[77,11],[76,11]]')");
const customer=randomUUID(),driver=randomUUID(),booking=randomUUID();
await db.query("insert into pilot_accounts(id,name,phone,role) values($1,'QA integration customer',$3,'customer'),($2,'QA integration driver',$4,'driver')",[customer,driver,'9'+String(Date.now()).slice(-9),'8'+String(Date.now()).slice(-9)]);
await db.query("insert into pilot_drivers(id,vehicle_type_id,vehicle_number,approval)values($1,'tipper_100','QA ONLY','approved')",[driver]);
await db.query("insert into pilot_bookings(id,short_code,customer_id,driver_id,status,payload,request_key)values($1,'QA-ROLLBACK',$2,$3,'AT_PICKUP',$4,$5)",[booking,customer,driver,JSON.stringify({pickup:{lat:10.5,lng:76.2},drop:{lat:10.6,lng:76.3},scheduledFor:new Date().toISOString(),loadPhotos:[],quote:{totalFare:1000}}),randomUUID()]);
await db.query('savepoint guard');try{await db.query("update pilot_bookings set status='IN_TRANSIT' where id=$1",[booking]);assert.fail('Departure without PIN must fail');}catch(e){assert.match(e.message,/PIN/);await db.query('rollback to savepoint guard');}
const pin=(await db.query('select start_pin from pilot_accounts where id=$1',[customer])).rows[0].start_pin;assert.match(pin,/^\d{4}$/);
const wrong=pin==='0000'?'0001':'0000';for(let i=0;i<5;i++){const r=(await db.query('select pilot_start_trip($1,$2,$3,$4) as result',[booking,driver,wrong,JSON.stringify({loadPhotos:['qa1','qa2']})])).rows[0].result;assert.ok(r.error);}
assert.ok((await db.query('select pin_lock_until>now() locked from pilot_bookings where id=$1',[booking])).rows[0].locked);
let r=(await db.query('select pilot_start_trip($1,$2,$3,$4) as result',[booking,driver,pin,JSON.stringify({loadPhotos:['qa1','qa2']})])).rows[0].result;assert.ok(r.error,'correct PIN is blocked during lock');
await db.query("update pilot_bookings set pin_lock_until=now()-interval '1 second' where id=$1",[booking]);
r=(await db.query('select pilot_start_trip($1,$2,$3,$4) as result',[booking,driver,pin,JSON.stringify({loadPhotos:['qa1','qa2']})])).rows[0].result;assert.equal(r.booking.status,'IN_TRANSIT');
assert.equal((await db.query('select start_pin from pilot_accounts where id=$1',[customer])).rows[0].start_pin,pin,'PIN persists');
await db.query('insert into pilot_ratings(booking_id,author_id,subject_id,rating)values($1,$2,$3,5),($1,$3,$2,4)',[booking,customer,driver]);assert.equal((await db.query('select count(*)::int n from pilot_ratings where booking_id=$1',[booking])).rows[0].n,2);
console.log('PASS: persistent customer PIN, wrong-PIN attempts/lock, locked correct PIN, verified departure, two-sided rating storage. All QA changes rolled back.');
}finally{await db.query('rollback');await db.end();}

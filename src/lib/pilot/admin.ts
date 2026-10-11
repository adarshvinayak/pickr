import {validServicePolygon} from './geo';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, audit, check, database, identity, json, passwordHash, PhoneSchema } from './server';
export async function adminData(req:NextRequest):Promise<NextResponse> {
 await identity(req,['admin']); const db=database();
 return NextResponse.json({data:{accounts:check(await db.from('pilot_accounts').select('id,name,phone,role,disabled,created_at').order('created_at',{ascending:false})),drivers:check(await db.from('pilot_drivers').select('*')),pendingPush: (await db.from('pilot_push_outbox').select('id',{count:'exact',head:true}).is('sent_at',null)).count}});
}
export async function adminAction(req:NextRequest):Promise<NextResponse> {
 const actor=await identity(req,['admin']); const raw=await json(req); const {action}=z.object({action:z.enum(['settings','zone','deleteZone','createAccount','editAccount','deleteAccount','approval','assign'])}).parse(raw); const db=database();
 if(action==='settings') {const input=z.object({allow_skips:z.boolean(),support_phone:z.string().max(20),paused:z.boolean(),require_device_area:z.boolean(),initial_radius_km:z.number().int().min(1).max(50),radius_step_km:z.number().int().min(1).max(50)}).parse(raw);check(await db.from('pilot_settings').update(input).eq('id',true));}
 if(action==='zone') {
 const input=z.object({id:z.string().uuid().optional(),name:z.string().trim().min(2).max(100),active:z.boolean(),polygon:z.array(z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)])).min(3).max(200)}).parse(raw);
 if(!validServicePolygon(input.polygon))throw new ApiError(400,'Draw a nonzero service boundary without crossed edges or repeated points.');
 check(await db.from('pilot_zones').upsert(input));
 }
 if(action==='deleteZone') {const {id}=z.object({id:z.string().uuid()}).parse(raw);check(await db.from('pilot_zones').delete().eq('id',id));}
 if(action==='createAccount') {
 const input=z.object({name:z.string().trim().min(2).max(100),phone:PhoneSchema,role:z.enum(['customer','driver','admin']),password:z.string().min(10).max(200).optional()}).parse(raw);
 if(input.role==='admin'&&!input.password) throw new ApiError(400,'Admin password must have at least 10 characters.');
 check(await db.from('pilot_accounts').insert({name:input.name,phone:input.phone,role:input.role,password_hash:input.password?passwordHash(input.password):null}));
 }
 if(action==='editAccount'||action==='deleteAccount') {
 const input=z.object({id:z.string().uuid(),name:z.string().trim().min(2).max(100).optional(),phone:PhoneSchema.optional(),disabled:z.boolean().optional(),password:z.string().min(10).max(200).optional()}).parse(raw);
 if(input.id===actor.id&&(action==='deleteAccount'||input.disabled)) throw new ApiError(400,'You cannot disable your own admin account.');
 const active=check(await db.from('pilot_bookings').select('id,status,payment_status').or(`customer_id.eq.${input.id},driver_id.eq.${input.id}`).in('status',['SEARCHING','ACCEPTED','AT_PICKUP','IN_TRANSIT','AT_DROP','COMPLETED']));
 if(active.some(b=>b.status!=='COMPLETED'||b.payment_status==='pending')) throw new ApiError(409,'Finish or cancel active work before editing this account.');
 // Deletion is an audited soft deletion to retain trip/payment records.
 const patch=action==='deleteAccount'?{disabled:true}:{...input,password_hash:input.password?passwordHash(input.password):undefined};
 if('password' in patch) delete patch.password;
 check(await db.rpc('pilot_account_edit',{p_actor:actor.id,p_target:input.id,p_patch:patch}));
 if(action==='deleteAccount'||input.disabled) {check(await db.from('pilot_sessions').delete().eq('account_id',input.id));check(await db.from('pilot_drivers').update({online:false}).eq('id',input.id));}
 }
 if(action==='approval') {const input=z.object({id:z.string().uuid(),approval:z.enum(['approved','rejected'])}).parse(raw);const driver=check(await db.from('pilot_drivers').select('active_booking_id').eq('id',input.id).single());if(driver.active_booking_id)throw new ApiError(409,'Driver has an active trip.');check(await db.from('pilot_drivers').update({approval:input.approval,online:false}).eq('id',input.id));}
 if(action==='assign') {const input=z.object({bookingId:z.string().uuid(),driverId:z.string().uuid()}).parse(raw);check(await db.rpc('pilot_accept',{p_booking:input.bookingId,p_driver:input.driverId,p_admin:actor.id}));}
 await audit(actor.id,`ADMIN_${action.toUpperCase()}`); return NextResponse.json({data:true});
}

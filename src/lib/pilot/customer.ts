import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {ApiError,audit,check,database,identity,json} from './server';
import type {Account,Trip} from './model';
export async function submitRating(_req:NextRequest,id:string,actor:Account,trip:Trip,input:{rating?:number;comment?:string}):Promise<NextResponse>{
 if(trip.status!=='COMPLETED'||trip.payment_status!=='paid'||!trip.driver_id)throw new ApiError(409,'Rate after work and payment are complete.');
 const customer=actor.role==='customer'&&actor.id===trip.customer_id;const driver=actor.role==='driver'&&actor.id===trip.driver_id;
 if(!customer&&!driver)throw new ApiError(403,'Only the customer and assigned driver can rate each other.');
 const data=z.object({rating:z.number().int().min(1).max(5),comment:z.string().max(500).default('')}).parse(input);
 const result=await database().from('pilot_ratings').insert({booking_id:id,author_id:actor.id,subject_id:customer?trip.driver_id:trip.customer_id,...data});
 if(result.error?.code==='23505')throw new ApiError(409,'You have already rated this trip.');check(result);await audit(actor.id,'RATED',{rating:data.rating},id);return NextResponse.json({data:true});
}
export async function customerProfile(req:NextRequest):Promise<NextResponse>{
 const actor=await identity(req,['customer']);const db=database();
 if(req.method==='POST'){
 const input=z.object({name:z.string().trim().min(2).max(100).optional(),email:z.union([z.string().email(),z.literal('')]).optional(),customerType:z.enum(['individual','business']).optional(),whatsapp:z.string().regex(/^[6-9]\d{9}$/).optional(),payMethod:z.enum(['gpay','cash']).optional(),photoUri:z.string().max(500).optional(),consent:z.object({bookings:z.literal(true),location:z.boolean(),whatsapp:z.literal(false),at:z.string().datetime()}).optional()}).parse(await json(req));
 if(input.photoUri&&!check(await db.from('pilot_uploads').select('path').eq('owner_id',actor.id).eq('purpose','profile').eq('path',input.photoUri).maybeSingle()))throw new ApiError(400,'Upload your profile photo first.');
 const current=check(await db.from('pilot_accounts').select('profile').eq('id',actor.id).single());const {name,...profile}=input;
 check(await db.from('pilot_accounts').update({...(name?{name}:{}),profile:{...current.profile,...profile}}).eq('id',actor.id));
 }
 const profile=check(await db.from('pilot_accounts').select('id,name,phone,profile,start_pin').eq('id',actor.id).single());return NextResponse.json({data:{...profile,startPin:profile.start_pin,start_pin:undefined}});
}

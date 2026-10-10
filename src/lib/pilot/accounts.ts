import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Account } from './model';
import { ApiError, check, database, digest, identity, issueSession, json, passwordHash, PhoneSchema, verifyPassword } from './server';
export async function login(req: NextRequest): Promise<NextResponse> {
 await rateLimit(req,40);
 const input = z.object({name:z.string().trim().min(2).max(100),phone:PhoneSchema,role:z.enum(['customer','driver'])}).parse(await json(req));
 const db=database();
 // Direct name/phone entry is explicitly requested for the private pilot. No OTP claim.
 const existing=check(await db.from('pilot_accounts').select('id,name,phone,role,disabled,created_at').eq('phone',input.phone).eq('role',input.role).maybeSingle()) as Account|null;
 if (existing?.disabled) throw new ApiError(403,'This account is disabled. Contact support.');
 let account=existing;
 if (!account) {
 const result=await db.from('pilot_accounts').insert(input).select('id,name,phone,role,disabled,created_at').single();
 if(result.error?.code==='23505') account=check(await db.from('pilot_accounts').select('id,name,phone,role,disabled,created_at').eq('phone',input.phone).eq('role',input.role).single()) as Account;
 else account=check(result) as Account;
 }
 return issueSession(account!);
}
export async function adminLogin(req: NextRequest): Promise<NextResponse> {
 await rateLimit(req,10);
 const input=z.object({phone:PhoneSchema,password:z.string().min(10).max(200)}).parse(await json(req));
 const db=database(); let account=check(await db.from('pilot_accounts').select('*').eq('role','admin').eq('phone',input.phone).maybeSingle());
 if (!account && process.env.ADMIN_BOOTSTRAP_PHONE===input.phone && process.env.ADMIN_BOOTSTRAP_PASSWORD && input.password===process.env.ADMIN_BOOTSTRAP_PASSWORD) {
 const count=await db.from('pilot_accounts').select('id',{count:'exact',head:true}).eq('role','admin');
 if(count.error) throw new ApiError(503,'Apply the pilot migration first.');
 if(count.count===0) account=check(await db.from('pilot_accounts').insert({name:'Pilot Admin',phone:input.phone,role:'admin',password_hash:passwordHash(input.password)}).select('*').single());
 }
 if(!account || account.disabled || !verifyPassword(input.password,account.password_hash||'')) throw new ApiError(401,'Invalid admin credentials.');
 const {password_hash: removed,...safe}=account; void removed; return issueSession(safe as Account);
}
export async function logout(req: NextRequest): Promise<NextResponse> {
 await identity(req); const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||req.cookies.get('pickr_session')?.value;
 if(token) check(await database().from('pilot_sessions').delete().eq('token_hash',digest(token)));
 const response=NextResponse.json({data:true}); response.cookies.delete('pickr_session'); return response;
}

async function rateLimit(req:NextRequest,limit:number):Promise<void> {
 const key=digest(`${req.nextUrl.pathname}:${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local'}`);
 if(!check(await database().rpc('pilot_login_limit',{p_key:key,p_limit:limit})))throw new ApiError(429,'Too many login attempts. Wait 15 minutes and try again.');
}

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Account, Role } from './model';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('your-') || key.includes('your-')) throw new ApiError(503, 'Supabase is not configured. Add the project URL and service role key, then run the pilot migration.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function check<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) { const message = result.error.message; throw new ApiError(/CONFLICT|TAKEN|BUSY|STAGE|EXPIRED/.test(message) ? 409 : /FORBIDDEN/.test(message) ? 403 : 500, message); } return result.data as NonNullable<T>;
}
export function digest(token: string): string { return createHash('sha256').update(token).digest('hex'); }
export function passwordHash(password: string): string { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
export function verifyPassword(password: string, hash: string): boolean { const [salt, value] = hash.split(':'); if (!salt || !value) return false; const actual = scryptSync(password, salt, 64); const expected = Buffer.from(value, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); }
export async function identity(req: NextRequest, roles: Role[] = ['customer', 'driver', 'admin']): Promise<Account> {
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '') || req.cookies.get('pickr_session')?.value;
  if (!token) throw new ApiError(401, 'Please sign in.');
  const db = database(); const session = check(await db.from('pilot_sessions').select('account_id').eq('token_hash', digest(token)).gt('expires_at', new Date().toISOString()).maybeSingle());
  if (!session) throw new ApiError(401, 'Your session expired. Please sign in again.');
  const account = check(await db.from('pilot_accounts').select('id,name,phone,role,disabled,created_at').eq('id', session.account_id).single()) as Account;
  if (account.disabled || !roles.includes(account.role)) throw new ApiError(403, 'Access denied.'); return account;
}
export async function audit(actor: string, action: string, details: Record<string, unknown> = {}, bookingId?: string): Promise<void> { check(await database().from('pilot_audit').insert({ actor_id: actor, action, details, booking_id: bookingId })); }
export function failure(error: unknown): NextResponse { if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, { status: 400 }); const status = error instanceof ApiError ? error.status : 500; return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed.' }, { status }); }
export async function issueSession(account: Account): Promise<NextResponse> {
  const token = randomBytes(32).toString('hex'); const expiry = new Date(Date.now() + 30 * 86400000);
  check(await database().from('pilot_sessions').insert({ account_id: account.id, token_hash: digest(token), expires_at: expiry.toISOString() }));
  const response = NextResponse.json({ data: { account, token } }); response.cookies.set('pickr_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', expires: expiry, path: '/' }); return response;
}
export async function json(req: NextRequest): Promise<unknown> { try { return await req.json(); } catch { throw new ApiError(400, 'Invalid JSON.'); } }
export const PointSchema = z.object({ label: z.string().min(1).max(200), address: z.string().max(500), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export const PhoneSchema = z.string().transform(v => v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')).pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number.'));

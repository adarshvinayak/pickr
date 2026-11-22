import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ApiError, check, database, PointSchema } from './server';
import { serviceable } from './geo';
import { selectVehicle } from '@/lib/vehicle-select';
import { calculateQuote } from '@/lib/pricing';
import { getMaterialById } from '@/config/materials';
import { calculateRoute } from '@/lib/mappls';
import type { QuoteResult, Zone, Settings } from './model';
export const IntakeSchema = z.object({ forOther:z.object({name:z.string().trim().min(2).max(100),phone:z.string().regex(/^[6-9]\d{9}$/),meets:z.enum(['pickup','drop','both']),pays:z.enum(['me','them'])}).optional(),materialId: z.string(), quantity: z.number().positive().max(100000), pickup: PointSchema, drop: PointSchema, labourNeeded: z.boolean().default(false), siteAccess: z.enum(['normal','narrow']).default('normal'), scheduledFor: z.string().datetime().optional(), notes: z.string().max(1000).default(''), transitPassNo: z.string().max(100).default(''), inputMode: z.enum(['voice','manual']).default('manual'), deviceLocation:z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),sampledAt:z.string().datetime()}).optional() });
export type Intake = z.infer<typeof IntakeSchema>;
export async function coverage(input: Intake): Promise<void> {
 const db = database(); const settings = check(await db.from('pilot_settings').select('*').single()) as Settings;
 if (settings.paused) throw new ApiError(422, 'Bookings are temporarily paused.');
 const zones = check(await db.from('pilot_zones').select('*').eq('active',true)) as Zone[];
 if(settings.require_device_area&&(!input.deviceLocation||Date.parse(input.deviceLocation.sampledAt)<Date.now()-300000||!serviceable(input.deviceLocation,zones)))throw new ApiError(422,'Your device is outside an active service area, or its location is unavailable. Enable location and check service availability.');
 if (!serviceable(input.pickup,zones) || !serviceable(input.drop,zones)) throw new ApiError(422, 'This area is currently not serviceable. Both pickup and destination must be inside an active service area.');
}
function key(): string { const secret = process.env.QUOTE_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY; if (!secret) throw new ApiError(503,'Quote signing is not configured.'); return secret; }
function sign(payload: string): string { return createHmac('sha256', key()).update(payload).digest('hex'); }
export async function quote(input: Intake): Promise<QuoteResult> {
 await coverage(input); const material = getMaterialById(input.materialId);
 if (!material || input.quantity < material.minQuantity) throw new ApiError(400,'Select a valid material and minimum quantity.');
 if (input.scheduledFor && Date.parse(input.scheduledFor) < Date.now()-60000) throw new ApiError(400,'Pickup time is in the past.');
 const selection = selectVehicle(input.materialId,input.quantity,input.siteAccess);
 if (selection.status!=='OPTIMAL') throw new ApiError(422, `${selection.explanation} Please book separate loads; multiple-trip dispatch is not available in this pilot.`);
 if (!selection.allowedVehicles.length) throw new ApiError(422,'No suitable vehicle for this load/access.');
 const route = await calculateRoute(input.pickup,input.drop,{scheduledFor:input.scheduledFor});
 const scheduledFor = input.scheduledFor || new Date().toISOString();
 const options = selection.allowedVehicles.map(vehicle => ({ vehicle, quote: calculateQuote({ vehicleTypeId: vehicle.id, distanceKm: route.distanceKm, labourNeeded: input.labourNeeded && !material.selfTipping, scheduledFor, isExpress: false }) }));
 const payload = Buffer.from(JSON.stringify({ input: {...input,scheduledFor}, route, options: options.map(o=>({id:o.vehicle.id,quote:o.quote})), expires: Date.now()+600000 })).toString('base64url');
 return {route,selection: {status:selection.status,explanation:selection.explanation},options,recommendedId:selection.vehicle.id,quoteToken:`${payload}.${sign(payload)}`};
}
export function readQuote(token: string, input: Intake, vehicleId: string): { input: Intake; route: QuoteResult['route']; price: QuoteResult['options'][number]['quote'] } {
 const [payload, signature] = token.split('.'); if (!payload || !signature || signature.length!==64 || !timingSafeEqual(Buffer.from(signature),Buffer.from(sign(payload)))) throw new ApiError(400,'Invalid quote. Please calculate it again.');
 const data = JSON.parse(Buffer.from(payload,'base64url').toString());
 if (data.expires<Date.now()) throw new ApiError(409,'Quote expired. Please calculate it again.');
 for (const field of ['forOther','materialId','quantity','pickup','drop','labourNeeded','siteAccess','scheduledFor','notes','transitPassNo','inputMode','deviceLocation'] as const) {
 if (field==='scheduledFor' && !input.scheduledFor) continue;
 if (JSON.stringify(input[field])!==JSON.stringify(data.input[field])) throw new ApiError(409,'Booking details changed. Please calculate a new quote.');
 }
 const selected = data.options.find((o: {id:string})=>o.id===vehicleId); if (!selected) throw new ApiError(400,'Vehicle is not eligible for this load.');
 return {input:data.input,route:data.route,price:selected.quote};
}

import type { RouteResult, TruckProfile } from '@/lib/maps';
import type { QuoteBreakdown } from '@/lib/pricing';
import type { VoiceParseResponse, VehicleType } from '@/types';
export type Role = 'customer' | 'driver' | 'admin';
export type Stage = 'SEARCHING' | 'ACCEPTED' | 'AT_PICKUP' | 'IN_TRANSIT' | 'AT_DROP' | 'COMPLETED' | 'CANCELLED' | 'NO_DRIVERS';
export interface Account { id: string; name: string; phone: string; role: Role; disabled: boolean; created_at: string; profile?:Record<string,unknown>; startPin?:string; rating?:{average:number|null;count:number} }
export interface Point { label: string; address: string; lat: number; lng: number }
export interface Zone { id: string; name: string; active: boolean; polygon: [number, number][] }
export interface Settings { id: boolean; allow_skips: boolean; support_phone: string; paused: boolean; require_device_area: boolean; initial_radius_km: number; radius_step_km: number }
export interface DriverProfile { id: string; vehicle_type_id: string; vehicle_number: string; routing_profile?: TruckProfile | null; approval: 'pending' | 'approved' | 'rejected' | 'test'; documents: Record<string, string>; onboarding_skipped: boolean; online: boolean; lat: number | null; lng: number | null; accuracy: number | null; position_at: string | null; device_at: string | null; active_booking_id: string | null }
export interface BookingData { forOther?:{name:string;phone:string;meets:string;pays:string}; transitPassPhoto?:string; driverReview?:{rating:number;comment:string}; materialId: string; quantity: number; unit: string; vehicleTypeId: string; pickup: Point; drop: Point; labourNeeded: boolean; siteAccess: 'normal' | 'narrow'; notes: string; transitPassNo: string; distanceKm: number; durationMin: number; polyline: string; quote: QuoteBreakdown; customerName: string; customerPhone: string; loadPhotos?: string[]; photosSkipped?: boolean; scheduledFor: string; inputMode: 'manual' | 'voice'; review?: { rating: number; comment: string }; collectionMethod?: 'cash' | 'upi'; collectionReference?: string; cancellationFee?: number }
export interface Trip { id: string; short_code: string; customer_id: string; driver_id: string | null; status: Stage; payload: BookingData; payment_status: 'pending' | 'paid'; search_started_at: string; radius_km: number; created_at: string; updated_at: string; pickup_at: string | null; loaded_at: string | null; drop_at: string | null; completed_at: string | null; paid_at: string | null; cancellation_reason: string | null; startPin?:string; ratings?:{author_id:string;subject_id:string;rating:number;comment:string}[]; navigation?: Navigation; driver?: DriverProfile & { name: string; phone: string } }
export interface Audit { id: string; booking_id: string | null; actor_id: string | null; action: string; details: Record<string, unknown>; created_at: string }
export interface Snapshot { account: Account; driver: DriverProfile | null; trips: Trip[]; offers: Trip[]; settings: Settings; zones: Zone[]; events?: Audit[] }
export interface QuoteResult { route: RouteResult; selection: { explanation: string; status: string }; options: { vehicle: VehicleType; quote: QuoteBreakdown }[]; recommendedId: string; quoteToken: string }
export type VoiceResult = VoiceParseResponse;

export interface RoadReport {id:string;lat:number;lng:number;kind:'closure'|'flooding'|'accident'|'congestion'|'site_access';notes:string;status:string;expires_at:string;created_at?:string}
export interface Navigation {booking_id:string;driver_id:string;stage:Stage;updated_at:string|null;error:string|null;attempted_at:string|null;result:(RouteResult & {origin:{lat:number;lng:number};positionAt:string;eta:string;target:'pickup'|'destination';reason:string;reports:RoadReport[]})|null}

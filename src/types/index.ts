import { z } from 'zod';

export type BodyType = 'open' | 'closed' | 'tipper';
export type SiteAccess = 'normal' | 'narrow';
export type UnitType = 'unit' | 'bag' | 'nos' | 'kg' | 'box' | 'bundle' | 'load';
export type BookingStatus =
  | 'DRAFT'
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'AT_PICKUP'
  | 'LOADED'
  | 'IN_TRANSIT'
  | 'AT_DROP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVERS';

export type PaymentMethod = 'cod' | 'online';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type InputMode = 'voice' | 'manual' | 'repeat';
export type Actor = 'user' | 'driver' | 'system';

export interface VehicleType {
  id: string;
  displayName: string;
  localNames: string[];
  capacityKg: number;
  volumeCft?: number;
  bodyType: BodyType;
  iconKey: string;
  baseFare: number;
  includedKm: number;
  perKmRate: number;
  minimumFare: number;
  labourCharge: number;
  waitingRateMin: number;
  sortOrder: number;
}

export interface Material {
  id: string;
  displayName: string;
  synonyms: string[];
  nativeUnit: UnitType;
  kgPerUnit: number;
  minQuantity: number;
  defaultVehicleId?: string;
  moistureSensitive: boolean;
  selfTipping: boolean;
  needsTransitPass: boolean;
  iconKey: string;
  sortOrder: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleTypeId: string;
  vehicleNumber: string;
  rating: number;
  isAvailable: boolean;
  homeLat: number;
  homeLng: number;
  currentLat?: number;
  currentLng?: number;
  preferredZones: string[];
}

export interface SavedSite {
  id: string;
  sessionId: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  siteAccess: SiteAccess;
  lastUsed: string;
}

export interface Booking {
  id: string;
  shortCode: string;
  sessionId: string;
  customerPhone?: string;
  customerName?: string;
  materialId: string;
  quantity: number;
  unit: string;
  totalWeightKg: number;
  vehicleTypeId: string;
  labourNeeded: boolean;
  siteAccess: SiteAccess;
  notes?: string;
  transitPassNo?: string;
  gstin?: string;
  pickupLabel: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropLabel: string;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  distanceKm: number;
  routePolyline?: string;
  durationMin: number;
  scheduledFor: string;
  isExpress: boolean;
  baseFare: number;
  distanceFare: number;
  labourFare: number;
  surgeMultiplier: number;
  surgeReason?: string;
  waitingFare: number;
  platformFee: number;
  gst: number;
  totalFare: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  driverId?: string;
  broadcastRadiusKm: number;
  cancelledBy?: Actor;
  cancellationFee?: number;
  podPhotoUrl?: string;
  podOtp?: string;
  driverRating?: number;
  inputMode: InputMode;
  rawTranscript?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingEvent {
  id: string;
  bookingId: string;
  status: BookingStatus;
  actor: Actor;
  note?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface TripPosition {
  bookingId: string;
  lat: number;
  lng: number;
  bearing?: number;
  progress: number;
  leg: 'to_pickup' | 'to_drop';
  etaMin?: number;
  updatedAt: string;
}

// Zod schemas for API validation
export const VoiceParseRequestSchema = z.object({
  transcript: z.string(),
  currentSlots: z.record(z.unknown()).optional(),
});

export const VoiceNextQuestionSchema = z.object({
  slot: z.string(),
  text: z.string(),
  chips: z.array(z.string()),
});

export const VoiceParseResponseSchema = z.object({
  material: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.enum(['unit', 'bag', 'nos', 'kg', 'box', 'bundle', 'load']).nullable(),
  pickupText: z.string().nullable(),
  dropText: z.string().nullable(),
  when: z.string().nullable(),
  labourNeeded: z.boolean().nullable(),
  siteAccess: z.enum(['normal', 'narrow']).nullable(),
  confidence: z.number(),
  nextQuestion: VoiceNextQuestionSchema.nullable(),
  readyToConfirm: z.boolean(),
});

export type VoiceParseResponse = z.infer<typeof VoiceParseResponseSchema>;

export const QuoteRequestSchema = z.object({
  materialId: z.string(),
  quantity: z.number().positive(),
  pickup: z.object({
    label: z.string(),
    address: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
  drop: z.object({
    label: z.string(),
    address: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
  labourNeeded: z.boolean().optional(),
  siteAccess: z.enum(['normal', 'narrow']).optional().default('normal'),
  scheduledFor: z.string().optional(),
  isExpress: z.boolean().optional(),
});

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const CreateBookingSchema = z.object({
  sessionId: z.string(),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  materialId: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  vehicleTypeId: z.string(),
  labourNeeded: z.boolean().default(false),
  siteAccess: z.enum(['normal', 'narrow']).default('normal'),
  notes: z.string().optional(),
  transitPassNo: z.string().optional(),
  gstin: z.string().optional(),
  pickup: z.object({
    label: z.string(),
    address: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
  drop: z.object({
    label: z.string(),
    address: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
  scheduledFor: z.string().optional(),
  isExpress: z.boolean().default(false),
  paymentMethod: z.enum(['cod', 'online']).default('cod'),
  inputMode: z.enum(['voice', 'manual', 'repeat']).default('manual'),
  rawTranscript: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

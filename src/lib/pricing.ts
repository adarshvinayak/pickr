import { PRICING_CONFIG } from '@/config/pricing';
import { getVehicleById } from '@/config/vehicles';

export interface QuoteInput {
  vehicleTypeId: string;
  distanceKm: number;
  labourNeeded?: boolean;
  scheduledFor?: Date | string;
  isExpress?: boolean;
  waitingMinutesPickup?: number;
  waitingMinutesDrop?: number;
}

export interface QuoteBreakdown {
  vehicleTypeId: string;
  baseFare: number;
  billableKm: number;
  includedKm: number;
  perKmRate: number;
  distanceFare: number;
  labourFare: number;
  waitingFare: number;
  subtotalBeforeSurge: number;
  surgeMultiplier: number;
  surgeReason?: string;
  subtotalAfterSurge: number;
  platformFee: number;
  gst: number;
  minimumFare: number;
  totalFare: number;
  displayTotalFare: number;
}

export function getSurgeMultiplier(scheduledDate?: Date, isExpress = false): { multiplier: number; reason?: string } {
  const date = scheduledDate || new Date();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(date));

  let timeMultiplier = 1.0;
  let reason: string | undefined = undefined;

  // Night: 22:00 to 05:59
  if (hour >= 22 || hour < 6) {
    timeMultiplier = PRICING_CONFIG.surgeMultipliers.night.multiplier;
    reason = PRICING_CONFIG.surgeMultipliers.night.label;
  }
  // Morning peak: 08:00 to 10:59
  else if (hour >= 8 && hour < 11) {
    timeMultiplier = PRICING_CONFIG.surgeMultipliers.morningPeak.multiplier;
    reason = PRICING_CONFIG.surgeMultipliers.morningPeak.label;
  }
  // Evening peak: 17:00 to 19:59
  else if (hour >= 17 && hour < 20) {
    timeMultiplier = PRICING_CONFIG.surgeMultipliers.eveningPeak.multiplier;
    reason = PRICING_CONFIG.surgeMultipliers.eveningPeak.label;
  }

  let finalMultiplier = timeMultiplier;
  if (isExpress) {
    finalMultiplier += PRICING_CONFIG.surgeMultipliers.expressAdditive;
    reason = reason ? `${reason} + Express booking` : 'Express booking (<60 min)';
  }

  return {
    multiplier: Number(finalMultiplier.toFixed(2)),
    reason: finalMultiplier > 1.0 ? reason : undefined,
  };
}

/** One source for the upfront waiting policy and the final fare calculation. */
export function waitingRatePerMinute(vehicleTypeId: string): number {
  const vehicle = getVehicleById(vehicleTypeId);
  if (!vehicle) throw new Error(`Unknown vehicle type id: ${vehicleTypeId}`);
  return vehicle.capacityKg <= 2500
    ? PRICING_CONFIG.waitingCharges.smallVehicleRatePerMin
    : PRICING_CONFIG.waitingCharges.largeVehicleRatePerMin;
}

export function calculateQuote(input: QuoteInput): QuoteBreakdown {
  const vehicle = getVehicleById(input.vehicleTypeId);
  if (!vehicle) {
    throw new Error(`Unknown vehicle type id: ${input.vehicleTypeId}`);
  }

  // Billable km rounded up to 1 decimal
  const billableKm = Math.ceil(input.distanceKm * 10) / 10;
  const extraKm = Math.max(0, billableKm - vehicle.includedKm);
  const distanceFare = Math.round(extraKm * vehicle.perKmRate);
  const labourFare = input.labourNeeded ? vehicle.labourCharge : 0;

  // Waiting charges (post-trip or estimated)
  let waitingFare = 0;
  if (input.waitingMinutesPickup || input.waitingMinutesDrop) {
    const billablePickupWait = Math.max(
      0,
      (input.waitingMinutesPickup || 0) - PRICING_CONFIG.waitingCharges.freeMinutesPickup
    );
    const billableDropWait = Math.max(
      0,
      (input.waitingMinutesDrop || 0) - PRICING_CONFIG.waitingCharges.freeMinutesDrop
    );
    const totalWaitMinutes = Math.ceil(billablePickupWait) + Math.ceil(billableDropWait);
    const waitRate = waitingRatePerMinute(input.vehicleTypeId);
    waitingFare = totalWaitMinutes * waitRate;
  }

  const subtotalBeforeSurge = vehicle.baseFare + distanceFare + labourFare + waitingFare;

  const scheduledDate = input.scheduledFor ? new Date(input.scheduledFor) : undefined;
  const { multiplier: surgeMultiplier, reason: surgeReason } = getSurgeMultiplier(scheduledDate, input.isExpress);

  const subtotalAfterSurge = Math.round(subtotalBeforeSurge * surgeMultiplier);

  // Platform fee: round(subtotalAfterSurge * 0.08)
  const platformFee = Math.round(subtotalAfterSurge * PRICING_CONFIG.platformFeeRate);

  // GST: round((subtotalAfterSurge + platformFee) * 0.05)
  const gst = Math.round((subtotalAfterSurge + platformFee) * PRICING_CONFIG.gstRate);

  const computedTotal = subtotalAfterSurge + platformFee + gst;
  const totalFare = Math.max(vehicle.minimumFare, computedTotal);

  // Rounded to nearest ₹10 for display
  const displayTotalFare = Math.round(totalFare / 10) * 10;

  return {
    vehicleTypeId: vehicle.id,
    baseFare: vehicle.baseFare,
    billableKm,
    includedKm: vehicle.includedKm,
    perKmRate: vehicle.perKmRate,
    distanceFare,
    labourFare,
    waitingFare,
    subtotalBeforeSurge,
    surgeMultiplier,
    surgeReason,
    subtotalAfterSurge,
    platformFee,
    gst,
    minimumFare: vehicle.minimumFare,
    totalFare,
    displayTotalFare,
  };
}

import { BookingStatus, Actor } from '@/types';
import { PRICING_CONFIG } from '@/config/pricing';

export interface TransitionCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface CancellationCheckResult {
  allowed: boolean;
  fee: number;
  reason?: string;
}

export interface RescheduleCheckResult {
  allowed: boolean;
  reason?: string;
  reenterSearching: boolean;
}

// Forward-only valid transitions map
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ['SEARCHING', 'CANCELLED'],
  SEARCHING: ['ACCEPTED', 'NO_DRIVERS', 'CANCELLED'],
  ACCEPTED: ['AT_PICKUP', 'SEARCHING', 'CANCELLED'], // SEARCHING when driver cancels or user reschedules
  AT_PICKUP: ['LOADED', 'CANCELLED'],
  LOADED: ['IN_TRANSIT'],
  IN_TRANSIT: ['AT_DROP'],
  AT_DROP: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_DRIVERS: ['SEARCHING'], // User may retry search
};

export function isValidStatusTransition(from: BookingStatus, to: BookingStatus): boolean {
  const allowedNext = VALID_TRANSITIONS[from];
  if (!allowedNext) return false;
  return allowedNext.includes(to);
}

export function validateStatusTransition(from: BookingStatus, to: BookingStatus): TransitionCheckResult {
  if (isValidStatusTransition(from, to)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Invalid status transition from ${from} to ${to}. Status flow is forward-only.`,
  };
}

export function validateCancellation(
  currentStatus: BookingStatus,
  actor: Actor,
  totalFare: number
): CancellationCheckResult {
  if (currentStatus === 'CANCELLED' || currentStatus === 'COMPLETED' || currentStatus === 'NO_DRIVERS') {
    return {
      allowed: false,
      fee: 0,
      reason: `Cannot cancel booking with status ${currentStatus}.`,
    };
  }

  if (actor === 'user') {
    // User allowed until before AT_PICKUP (i.e. DRAFT, SEARCHING, ACCEPTED)
    if (['DRAFT', 'SEARCHING'].includes(currentStatus)) {
      return { allowed: true, fee: 0 };
    }
    if (currentStatus === 'ACCEPTED') {
      // Fee: ₹100 or 10% (whichever lower)
      const tenPercent = Math.round(totalFare * PRICING_CONFIG.cancellation.userFeePercentage);
      const fee = Math.min(PRICING_CONFIG.cancellation.userFeeAfterAccepted, tenPercent);
      return { allowed: true, fee };
    }
    return {
      allowed: false,
      fee: 0,
      reason: `Cancellation not allowed once driver has reached pickup (status: ${currentStatus}).`,
    };
  }

  if (actor === 'driver') {
    // Driver allowed before LOADED (i.e. ACCEPTED, AT_PICKUP)
    if (['ACCEPTED', 'AT_PICKUP'].includes(currentStatus)) {
      return { allowed: true, fee: 0 };
    }
    return {
      allowed: false,
      fee: 0,
      reason: `Driver cannot cancel once load is picked up (status: ${currentStatus}).`,
    };
  }

  // System cancel
  return { allowed: true, fee: 0 };
}

export function validateReschedule(currentStatus: BookingStatus, actor: Actor): RescheduleCheckResult {
  if (actor !== 'user') {
    return {
      allowed: false,
      reason: 'Only customers can reschedule a booking.',
      reenterSearching: false,
    };
  }

  if (currentStatus === 'SEARCHING') {
    return { allowed: true, reenterSearching: false };
  }

  if (currentStatus === 'ACCEPTED') {
    // Rescheduling releases the driver and re-enters SEARCHING at the new time
    return { allowed: true, reenterSearching: true };
  }

  return {
    allowed: false,
    reason: `Reschedule is blocked from ${currentStatus} onward.`,
    reenterSearching: false,
  };
}

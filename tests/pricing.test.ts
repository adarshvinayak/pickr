import { describe, it, expect } from 'vitest';
import { calculateQuote, getSurgeMultiplier } from '@/lib/pricing';

describe('Pricing Engine (BUSINESS_RULES.md §4)', () => {
  it('Sanity check §4.2: tipper_100 at 10 km ≈ ₹1,588', () => {
    // Standard daytime booking (14:00 / 2 PM local)
    const middayDate = new Date('2026-08-24T14:00:00');
    const quote = calculateQuote({
      vehicleTypeId: 'tipper_100',
      distanceKm: 10,
      labourNeeded: false,
      scheduledFor: middayDate,
      isExpress: false,
    });

    expect(quote.baseFare).toBe(1400);
    expect(quote.billableKm).toBe(10);
    expect(quote.includedKm).toBe(10);
    expect(quote.distanceFare).toBe(0);
    expect(quote.labourFare).toBe(0);
    expect(quote.subtotalBeforeSurge).toBe(1400);
    expect(quote.surgeMultiplier).toBe(1.0);
    expect(quote.subtotalAfterSurge).toBe(1400);
    expect(quote.platformFee).toBe(112); // round(1400 * 0.08)
    expect(quote.gst).toBe(76); // round((1400 + 112) * 0.05) = 75.6 -> 76
    expect(quote.totalFare).toBe(1588);
    expect(quote.displayTotalFare).toBe(1590); // Nearest ₹10
  });

  it('Calculates distance fare for km above includedKm', () => {
    const middayDate = new Date('2026-08-24T12:00:00Z');
    const quote = calculateQuote({
      vehicleTypeId: 'tipper_100',
      distanceKm: 15, // 5 km extra @ ₹55/km = ₹275
      labourNeeded: false,
      scheduledFor: middayDate,
      isExpress: false,
    });

    expect(quote.billableKm).toBe(15);
    expect(quote.distanceFare).toBe(275);
    expect(quote.subtotalBeforeSurge).toBe(1675); // 1400 + 275
  });

  it('Applies night surge multiplier (1.20) for 23:00', () => {
    const nightDate = new Date('2026-08-24T23:30:00');
    const { multiplier, reason } = getSurgeMultiplier(nightDate, false);
    expect(multiplier).toBe(1.2);
    expect(reason).toContain('Night charge');

    const quote = calculateQuote({
      vehicleTypeId: 'tata_ace',
      distanceKm: 3,
      scheduledFor: nightDate,
    });

    expect(quote.surgeMultiplier).toBe(1.2);
    expect(quote.subtotalAfterSurge).toBe(Math.round(250 * 1.2)); // 300
  });

  it('Applies morning peak (1.10) and express (+0.15 additive) surge', () => {
    const morningPeak = new Date('2026-08-24T09:15:00');
    const { multiplier } = getSurgeMultiplier(morningPeak, true);
    expect(multiplier).toBe(1.25); // 1.10 + 0.15
  });

  it('Includes labour charge when labourNeeded is true', () => {
    const quote = calculateQuote({
      vehicleTypeId: 'tata_ace',
      distanceKm: 3,
      labourNeeded: true,
      scheduledFor: new Date('2026-08-24T14:00:00'),
    });

    expect(quote.labourFare).toBe(250); // tata_ace labour charge
    expect(quote.subtotalBeforeSurge).toBe(500); // 250 base + 250 labour
  });

  it('Enforces minimum fare', () => {
    const quote = calculateQuote({
      vehicleTypeId: 'pickup_auto',
      distanceKm: 0.5,
      labourNeeded: false,
      scheduledFor: new Date('2026-08-24T14:00:00'),
    });

    expect(quote.minimumFare).toBe(200);
    expect(quote.totalFare).toBeGreaterThanOrEqual(200);
  });
});

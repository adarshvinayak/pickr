export const PRICING_CONFIG = {
  platformFeeRate: 0.08, // 8%
  gstRate: 0.05, // 5%
  surgeMultipliers: {
    night: {
      multiplier: 1.2,
      startHour: 22,
      endHour: 6, // 22:00 to 05:59
      label: 'Night charge (22:00–05:59)',
    },
    morningPeak: {
      multiplier: 1.1,
      startHour: 8,
      endHour: 11, // 08:00 to 10:59
      label: 'Morning peak charge (08:00–10:59)',
    },
    eveningPeak: {
      multiplier: 1.1,
      startHour: 17,
      endHour: 20, // 17:00 to 19:59
      label: 'Evening peak charge (17:00–19:59)',
    },
    standard: {
      multiplier: 1.0,
      label: 'Standard rate',
    },
    expressAdditive: 0.15, // +0.15 additive for < 60 min pickup
  },
  waitingCharges: {
    freeMinutesPickup: 30,
    freeMinutesDrop: 30,
    smallVehicleRatePerMin: 4, // <= 2500 kg
    largeVehicleRatePerMin: 8, // > 2500 kg
  },
  cancellation: {
    userFeeAfterAccepted: 100, // ₹100 or 10% (whichever lower)
    userFeePercentage: 0.1,
  },
};

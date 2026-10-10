import { describe, it, expect } from 'vitest';
import { selectVehicle } from '@/lib/vehicle-select';

describe('Vehicle Selection Algorithm (BUSINESS_RULES.md §3)', () => {
  it('Worked example 1: 1 unit M-Sand → 4,500 kg → tipper only → tipper_100', () => {
    const result = selectVehicle('m_sand', 1, 'normal');
    expect(result.status).toBe('OPTIMAL');
    expect(result.totalKg).toBe(4500);
    expect(result.vehicle.id).toBe('tipper_100');
    expect(result.vehicle.bodyType).toBe('tipper');
    expect(result.tripCount).toBe(1);
  });

  it('Worked example 2: 2 unit M-Sand → 9,000 kg → tipper_200', () => {
    const result = selectVehicle('m_sand', 2, 'normal');
    expect(result.status).toBe('OPTIMAL');
    expect(result.totalKg).toBe(9000);
    expect(result.vehicle.id).toBe('tipper_200');
    expect(result.vehicle.bodyType).toBe('tipper');
    expect(result.tripCount).toBe(1);
  });

  it('Worked example 3: 30 bags cement → 1,500 kg → moisture sensitive → lcv_14ft (closed)', () => {
    const result = selectVehicle('cement', 30, 'normal');
    expect(result.status).toBe('OPTIMAL');
    expect(result.totalKg).toBe(1500);
    expect(result.vehicle.id).toBe('lcv_14ft');
    expect(result.tripCount).toBe(1);
  });

  it('Worked example 4: 10 bags cement → 500 kg → tata_ace (closed)', () => {
    const result = selectVehicle('cement', 10, 'normal');
    expect(result.status).toBe('OPTIMAL');
    expect(result.totalKg).toBe(500);
    expect(result.vehicle.id).toBe('tata_ace');
    expect(result.tripCount).toBe(1);
  });

  it('Worked example 5: 1 load debris, narrow lane → 4,000 kg capped at 2,500 → SPLIT_REQUIRED, 2 trips', () => {
    const result = selectVehicle('debris', 1, 'narrow');
    expect(result.status).toBe('SPLIT_REQUIRED');
    expect(result.totalKg).toBe(4000);
    expect(result.tripCount).toBe(2);
    expect(result.vehicle.capacityKg).toBeLessThanOrEqual(2500);
  });

  it('Worked example 6: 500 kg TMT steel → tata_ace', () => {
    const result = selectVehicle('steel', 500, 'normal');
    expect(result.status).toBe('OPTIMAL');
    expect(result.totalKg).toBe(500);
    expect(result.vehicle.id).toBe('tata_ace');
    expect(result.tripCount).toBe(1);
  });

  it('Multi-trip when exceeding max truck capacity (> 25,000 kg)', () => {
    const result = selectVehicle('m_sand', 6, 'normal'); // 6 * 4500 = 27,000 kg
    expect(result.status).toBe('MULTI_TRIP');
    expect(result.totalKg).toBe(27000);
    expect(result.tripCount).toBe(2);
    expect(result.vehicle.id).toBe('taurus_700');
  });
});

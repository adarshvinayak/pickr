import { getMaterialById } from '@/config/materials';
import { VEHICLE_TYPES, getVehicleById } from '@/config/vehicles';
import { VehicleType, SiteAccess } from '@/types';

export interface VehicleSelectionResult {
  status: 'OPTIMAL' | 'SPLIT_REQUIRED' | 'MULTI_TRIP';
  vehicle: VehicleType;
  totalKg: number;
  tripCount: number;
  explanation: string;
  allowedVehicles: VehicleType[];
}

export function selectVehicle(
  materialId: string,
  quantity: number,
  siteAccess: SiteAccess = 'normal'
): VehicleSelectionResult {
  const material = getMaterialById(materialId);
  if (!material) {
    throw new Error(`Unknown material id: ${materialId}`);
  }

  const totalKg = quantity * material.kgPerUnit;

  // Multi-trip condition when total weight exceeds largest vehicle capacity (25,000 kg)
  if (totalKg > 25000) {
    const largestVehicle = getVehicleById('taurus_700')!;
    const tripCount = Math.ceil(totalKg / 25000);
    return {
      status: 'MULTI_TRIP',
      vehicle: largestVehicle,
      totalKg,
      tripCount,
      explanation: `${largestVehicle.displayName} — ${tripCount} trips required for ${quantity} ${material.nativeUnit} of ${material.displayName} (${totalKg} kg).`,
      allowedVehicles: [largestVehicle],
    };
  }

  // Narrow lane access condition: Max capacity is 2500 kg
  if (siteAccess === 'narrow') {
    if (totalKg > 2500) {
      // Find smallest vehicle that fits within 2500 kg (max allowed for narrow lane)
      const allowedNarrow = VEHICLE_TYPES.filter((v) => v.capacityKg <= 2500);
      // For narrow split, we choose the largest narrow vehicle (lcv_14ft, 2500kg)
      const chosen = allowedNarrow.find((v) => v.id === 'lcv_14ft') || allowedNarrow[allowedNarrow.length - 1];
      const tripCount = Math.ceil(totalKg / 2500);
      return {
        status: 'SPLIT_REQUIRED',
        vehicle: chosen,
        totalKg,
        tripCount,
        explanation: `Narrow lane access limit (2,500 kg) requires splitting into ${tripCount} trips.`,
        allowedVehicles: allowedNarrow,
      };
    }
  }

  // Candidates that can carry the load
  let candidates = VEHICLE_TYPES.filter((v) => v.capacityKg >= totalKg);

  if (siteAccess === 'narrow') {
    candidates = candidates.filter((v) => v.capacityKg <= 2500);
  }

  // If material tips, filter strictly to tippers
  if (material.selfTipping) {
    candidates = candidates.filter((v) => v.bodyType === 'tipper');
  } else if (material.moistureSensitive && totalKg <= 3500) {
    // Prefer closed body if moisture sensitive and <= 3500 kg
    // tata_ace (750kg), lcv_14ft (2500kg), container_17ft (3500kg) are suitable for closed/weather-protected loads
    const closedCandidates = candidates.filter(
      (v) => v.bodyType === 'closed' || v.id === 'tata_ace' || v.id === 'lcv_14ft' || v.id === 'container_17ft'
    );
    if (closedCandidates.length > 0) {
      candidates = closedCandidates;
    }
  }

  if (candidates.length === 0) {
    // Fallback to largest available vehicle
    candidates = [VEHICLE_TYPES[VEHICLE_TYPES.length - 1]];
  }

  // Pick smallest candidate by capacityKg
  candidates.sort((a, b) => a.capacityKg - b.capacityKg);
  const chosenVehicle = candidates[0];

  // User may manually override to any larger vehicle (never smaller)
  const allowedVehicles = VEHICLE_TYPES.filter((v) => {
    if (v.capacityKg < Math.max(totalKg, chosenVehicle.capacityKg)) return false;
    if (material.selfTipping && v.bodyType !== 'tipper') return false;
    if (siteAccess === 'narrow' && v.capacityKg > 2500) return false;
    return true;
  });

  const explanation = `${chosenVehicle.displayName} — right size for ${quantity} ${material.nativeUnit} of ${material.displayName}.`;

  return {
    status: 'OPTIMAL',
    vehicle: chosenVehicle,
    totalKg,
    tripCount: 1,
    explanation,
    allowedVehicles,
  };
}

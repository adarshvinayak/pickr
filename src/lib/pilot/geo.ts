import type { Point, Zone } from './model';
export function inPolygon(point: Pick<Point, 'lat' | 'lng'>, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j];
    const cross = (point.lng - xi) * (yj - yi) - (point.lat - yi) * (xj - xi);
    if (Math.abs(cross) < 1e-9 && point.lng >= Math.min(xi, xj) && point.lng <= Math.max(xi, xj) && point.lat >= Math.min(yi, yj) && point.lat <= Math.max(yi, yj)) return true;
    if ((yi > point.lat) !== (yj > point.lat) && point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function serviceable(point: Pick<Point, 'lat' | 'lng'>, zones: Zone[]): boolean { return zones.some(z => z.active && inPolygon(point, z.polygon)); }
export function searchRadius(elapsedMs: number, initial: number, step: number): number { return initial + Math.min(4, Math.max(0, Math.floor(elapsedMs / 60000))) * step; }
export const NEXT_STAGE = { ACCEPTED: 'AT_PICKUP', AT_PICKUP: 'IN_TRANSIT', IN_TRANSIT: 'AT_DROP', AT_DROP: 'COMPLETED' } as const;
export function photoRequirement(count: number, skipped: boolean, allowSkips: boolean): boolean { return count >= 2 || (skipped && allowSkips); }

export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
 const rad = Math.PI / 180; const a = Math.sin((lat2-lat1)*rad/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin((lon2-lon1)*rad/2)**2; return 6371*2*Math.asin(Math.sqrt(Math.min(1,a)));
}

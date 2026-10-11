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
/** Reject crossed or collapsed service polygons before saving dispatch boundaries. */
export function validServicePolygon(input:[number,number][]):boolean {
 const polygon=input.length>3&&input[0][0]===input.at(-1)![0]&&input[0][1]===input.at(-1)![1]?input.slice(0,-1):input;
 if(polygon.length<3||new Set(polygon.map(p=>p.join(','))).size!==polygon.length)return false;
 const area=polygon.reduce((sum,p,i)=>{const next=polygon[(i+1)%polygon.length];return sum+p[0]*next[1]-next[0]*p[1];},0);
 if(Math.abs(area)<1e-8)return false;
 const orientation=(a:number[],b:number[],c:number[])=>Math.sign((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));
 const onSegment=(a:number[],b:number[],p:number[])=>orientation(a,b,p)===0&&p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]);
 for(let i=0;i<polygon.length;i++)for(let j=i+1;j<polygon.length;j++){
  if(j===i+1||i===0&&j===polygon.length-1)continue;
  const a=polygon[i],b=polygon[(i+1)%polygon.length],c=polygon[j],d=polygon[(j+1)%polygon.length];
  if(orientation(a,b,c)*orientation(a,b,d)<0&&orientation(c,d,a)*orientation(c,d,b)<0||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b))return false;
 }
 return true;
}

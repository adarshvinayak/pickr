/**
 * Where Pickr can send a truck (handoff rule 1: pickup and delivery must both
 * be inside an active service area).
 *
 * DEMO until the server sends the admin's active areas (A05/A06): one
 * generous outline of Kerala, with a little sea margin so coastal sites pass.
 * The map picker blocks Confirm outside it, and GPS "current place" says so.
 */
export type LatLng = { latitude: number; longitude: number };

type Area = { name: string; outline: LatLng[] };

import {getSnapshot} from './api';
export const SERVICE_AREAS:Area[]=[];
/** Where "Go to the service area" takes the map: Thrissur town, the pilot's home. */
export const AREA_HOME: LatLng = { latitude: 10.5276, longitude: 76.2144 };

/** Ray casting: is the point inside the outline? */
function inside(point: LatLng, outline: LatLng[]) {
  let hit = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i];
    const b = outline[j];
    const crosses =
      a.latitude > point.latitude !== b.latitude > point.latitude &&
      point.longitude < ((b.longitude - a.longitude) * (point.latitude - a.latitude)) / (b.latitude - a.latitude) + a.longitude;
    if (crosses) hit = !hit;
  }
  return hit;
}

/** The active area that holds the point, if any. */
export function areaOf(point: LatLng) {
  return (getSnapshot()?.zones||[]).filter((z:any)=>z.active).map((z:any)=>({name:z.name,outline:z.polygon.map(([longitude,latitude]:number[])=>({latitude,longitude}))})).find((area:Area)=>inside(point,area.outline));
}

export const inServiceArea = (point: LatLng) => areaOf(point) !== undefined;

/** Straight-line distance in metres (haversine); good enough for "is this the same spot". */
export function distanceM(a: LatLng, b: LatLng) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

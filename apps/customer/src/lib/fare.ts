import type { Trip } from './trips';

/**
 * Fare lines in the pilot's order (docs/PILOT_APK_ANALYSIS.md §2). Transport
 * only: material cost is never part of a Pickr fare.
 *
 * DEMO pricing until the quote service is connected: the split of a quote
 * into lines and the rain surcharge are illustrative; the waiting rates and
 * the 30 free minutes per site are the pilot's real rules.
 */
export type FareLineKey = 'base' | 'distance' | 'waiting' | 'rain' | 'platform' | 'gst';
export type FareLine = { key: FareLineKey; amount: number; /** e.g. "12 min × ₹8" */ detail?: string };
export type Fare = { lines: FareLine[]; total: number };

export const FREE_MINUTES = 30;
const PLATFORM_FEE = 49;
const GST_RATE = 0.05;
/** Share of the quote that is the distance charge, in the demo split. */
const DISTANCE_SHARE = 0.25;
/** DEMO: rain adds 10% of the base fare. */
const RAIN_SHARE = 0.1;

const SMALL_TRUCKS = ['Pickup Auto','Tata Ace','Bolero Pickup','14ft Lorry','lorry-14'];

/** ₹ per minute of waiting beyond the free time (pilot: small ₹4, large ₹8). */
export function waitRate(vehicleName: string) {
  return SMALL_TRUCKS.includes(vehicleName) ? 4 : 8;
}

/** Splits a quoted transport total into base, distance, platform fee and GST. */
export function splitQuote(total: number, rain = false): Fare {
  const gst = Math.round((total * GST_RATE) / (1 + GST_RATE));
  const beforeFees = total - gst - PLATFORM_FEE;
  const distance = Math.round(beforeFees * DISTANCE_SHARE);
  const base = beforeFees - distance;
  const lines: FareLine[] = [
    { key: 'base', amount: base },
    { key: 'distance', amount: distance },
  ];
  let sum = total;
  if (rain) {
    const surcharge = Math.round(base * RAIN_SHARE);
    lines.push({ key: 'rain', amount: surcharge });
    sum += surcharge;
  }
  lines.push({ key: 'platform', amount: PLATFORM_FEE }, { key: 'gst', amount: gst });
  return { lines, total: sum };
}

/** Minutes past the free allowance between two moments (0 while inside it). */
export function overtimeMinutes(from?: Date, to?: Date | number) {
  if (!from || to == null) return 0;
  const end = typeof to === 'number' ? to : to.getTime();
  const minutes = Math.floor((end - from.getTime()) / 60_000);
  return Math.max(0, minutes - FREE_MINUTES);
}

/** The trip's fare so far: the quote split, plus waiting at both sites, plus rain if it applied. */
export function fromServerQuote(q:any):Fare{const fields:[FareLineKey,string][]=[['base','baseFare'],['distance','distanceFare'],['waiting','waitingFare'],['platform','platformFee'],['gst','gst']];const lines=fields.map(([key,field])=>({key,amount:q[field]||0}));const adjustment=q.totalFare-lines.reduce((sum,l)=>sum+l.amount,0);if(adjustment)lines.push({key:'base',amount:adjustment});return {lines,total:q.totalFare};}
export function tripFare(trip:Trip,_now=Date.now()):Fare{return trip.raw?.payload.quote?fromServerQuote(trip.raw.payload.quote):{lines:[],total:trip.amount||0};}

/** Seconds of free time left at the current site, or negative once into overtime. */
export function freeSecondsLeft(trip: Trip, now = Date.now()) {
  const arrived = trip.stage === 'loading' ? trip.pickupAt : trip.stage === 'unloading' ? trip.dropAt : undefined;
  if (!arrived) return null;
  return FREE_MINUTES * 60 - Math.floor((now - arrived.getTime()) / 1000);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { OtherPerson } from './people';
import {type TripEvent} from './trip-machine';
import {api,refreshSnapshot,getSnapshot,subscribe,reverseId,itemIds,vehicleIds} from './api';
import {useSyncExternalStore} from 'react';

/** Trip stages from the handoff's permission matrix (section 9). */
export type TripStage =
  | 'scheduled'
  | 'searching'
  | 'to_pickup'
  | 'loading'
  | 'in_transit'
  | 'unloading'
  | 'payment_due'
  | 'completed'
  | 'cancelled'
  | 'no_driver';

export type Trip = {
  raw?:any;
  review?:{rating:number;comment:string};
  rating?:{average:number|null;count:number};
  id: string;
  code: string;
  stage: TripStage;
  material: string;
  quantity: string;
  vehicle: string;
  /** Registration of the assigned truck, once a driver has accepted. */
  registration?: string;
  pickup: string;
  delivery: string;
  /** When the booking was made, or the scheduled pickup for scheduled trips. */
  when: Date;
  etaMinutes?: number;
  /** When the driver's phone last reported its location; may be stale. */
  lastLocationAt?: Date;
  notes?: string;
  /** The approximate range quoted at booking, so every screen shows the same figures. */
  estimate?: { low: number; high: number };
  /** Estimate before completion, final amount after. */
  amount?: number;
  paid?: boolean;
  /** Assigned driver, once one accepts (C14). */
  driver?: {
    name: string;
    phone: string;
    verified: boolean;
    /** Track record from the server, when known; trust tags are only shown from real numbers. */
    stats?: { trips: number; onTimePct: number; cancels: number };
  };
  /** Four-digit start PIN the customer reads to the driver at pickup (DEMO until the server issues it). */
  pin?: string;
  /** Road distance left to the current target, when known. */
  distanceKm?: number;
  /** Site coordinates when picked by GPS or on the map; typed addresses have none. */
  pickupCoords?: { latitude: number; longitude: number };
  deliveryCoords?: { latitude: number; longitude: number };
  transitPass?: string;
  /** Payment method recorded by the driver (C13): cash or direct UPI. */
  paymentMethod?: 'cash' | 'upi';
  /** How the customer said they will pay (Profile › Payments), shown to the driver. */
  payPreference?: 'gpay' | 'whatsapp' | 'cash';
  paidAt?: Date;
  /** When a driver accepted; drives the brief "driver found" moment on the tracking screen. */
  assignedAt?: Date;
  cancelReason?: string;
  /** Cancellation charge recorded at cancel time: 0 while searching, min(₹100, 10%) after acceptance (pilot rule). */
  cancelFee?: number;
  /** When the current five-minute search began (pilot `search_started_at`); a retry starts a new one. */
  searchStartedAt?: Date;
  /** Why the last driver released the job; the customer is back to searching (rule 10). */
  releaseReason?: string;
  /** Progress comes from the demo simulator, not a real driver. */
  simulated?: boolean;
  /** Catalogue ids, for photos and pricing rules. */
  itemId?: string;
  vehicleId?: string;
  /** The transport quote at booking (centre of the estimate range); `amount` becomes the final figure. */
  quote?: number;
  /** DEMO: a rain surcharge applied to this trip. */
  rain?: boolean;
  /** Pilot timestamps (docs/PILOT_APK_ANALYSIS.md §1): arrived at pickup, left with the load, arrived at drop, unloading finished. */
  pickupAt?: Date;
  startedAt?: Date;
  dropAt?: Date;
  completedAt?: Date;
  /** Load photos the driver added before leaving pickup (C10); DEMO entries name catalogue images. */
  loadPhotos?: string[];
  photosSkipped?: boolean;
  /** Booked for someone else: who meets the truck, where, and who pays the driver. */
  forOther?: OtherPerson;
};

/** Pilot server statuses (shared with the driver app) for each stage of this app. */
export const SERVER_STATUS: Record<TripStage, string> = {
  scheduled: 'SEARCHING',
  searching: 'SEARCHING',
  to_pickup: 'ACCEPTED',
  loading: 'AT_PICKUP',
  in_transit: 'IN_TRANSIT',
  unloading: 'AT_DROP',
  payment_due: 'COMPLETED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  no_driver: 'NO_DRIVERS',
};

/**
 * Allowed stage changes (the driver app's buttons, the search timer and the
 * customer's cancel). Anything else is refused, so a late or duplicated
 * update can never move a trip backwards or skip payment (rules 8 and 9).
 */
const NEXT_STAGES: Record<TripStage, TripStage[]> = {
  scheduled: ['searching', 'cancelled'],
  searching: ['to_pickup', 'no_driver', 'cancelled'],
  to_pickup: ['loading', 'searching', 'cancelled'],
  loading: ['in_transit', 'searching'],
  in_transit: ['unloading'],
  unloading: ['payment_due'],
  payment_due: ['completed'],
  completed: [],
  cancelled: [],
  no_driver: ['searching'],
};

export const canMove = (from: TripStage, to: TripStage) => from === to || NEXT_STAGES[from].includes(to);

/** Every stage where the trip still reserves the customer (rule 8 and C02). */
const ACTIVE: TripStage[] = ['searching', 'to_pickup', 'loading', 'in_transit', 'unloading', 'payment_due'];
export const isActive = (trip: Trip) => ACTIVE.includes(trip.stage);
export const isRequest = (trip: Trip) => trip.stage === 'scheduled' || trip.stage === 'searching';
export const isPast = (trip: Trip) => ['completed', 'cancelled', 'no_driver'].includes(trip.stage);


export function mapTrip(t:any):Trip{const p=t.payload;return {id:t.id,code:t.short_code,stage:t.status==='SEARCHING'?(Date.parse(p.scheduledFor)>Date.now()?'scheduled':'searching'):t.status==='COMPLETED'?(t.payment_status==='paid'?'completed':'payment_due'):({ACCEPTED:'to_pickup',AT_PICKUP:'loading',IN_TRANSIT:'in_transit',AT_DROP:'unloading',CANCELLED:'cancelled',NO_DRIVERS:'no_driver'} as any)[t.status],material:p.materialId.replaceAll('_',' '),quantity:`${p.quantity} ${p.unit==='nos'?'numbers':p.unit}`,vehicle:reverseId(vehicleIds,p.vehicleTypeId),registration:t.driver?.vehicle_number,pickup:p.pickup.address||p.pickup.label,delivery:p.drop.address||p.drop.label,when:new Date(p.scheduledFor),quote:p.quote.totalFare,amount:p.quote.totalFare,paid:t.payment_status==='paid',driver:t.driver?{name:t.driver.name,phone:t.driver.phone,verified:t.driver.approval==='approved'}:undefined,pin:t.startPin,etaMinutes:t.navigation?.result?.durationMin,distanceKm:t.navigation?.result?.distanceKm,lastLocationAt:t.driver?.position_at?new Date(t.driver.position_at):undefined,pickupCoords:{latitude:p.pickup.lat,longitude:p.pickup.lng},deliveryCoords:{latitude:p.drop.lat,longitude:p.drop.lng},notes:p.notes,transitPass:p.transitPassNo,paymentMethod:p.collectionMethod,paidAt:t.paid_at?new Date(t.paid_at):undefined,pickupAt:t.pickup_at?new Date(t.pickup_at):undefined,startedAt:t.loaded_at?new Date(t.loaded_at):undefined,dropAt:t.drop_at?new Date(t.drop_at):undefined,completedAt:t.completed_at?new Date(t.completed_at):undefined,searchStartedAt:new Date(t.search_started_at),itemId:reverseId(itemIds,p.materialId),vehicleId:reverseId(vehicleIds,p.vehicleTypeId),cancelReason:t.cancellation_reason,cancelFee:p.cancellationFee,loadPhotos:p.loadPhotos,photosSkipped:p.photosSkipped,forOther:p.forOther,review:p.review,raw:t};}
type Value={trips:Trip[];activeTrip:Trip|undefined;nextScheduled:Trip|undefined;dispatch:(id:string,event:TripEvent|((t:Trip)=>TripEvent|null))=>Promise<void>;addTrip:(input:any)=>never;updateTrip:(id:string,patch:any)=>void;demoActive:boolean;setDemoActive:(value:boolean)=>void;error:string;refresh:()=>Promise<unknown>};
const TripsContext=createContext<Value|null>(null);
export function TripsProvider({children}:PropsWithChildren){const snapshot=useSyncExternalStore(subscribe,getSnapshot,()=>null);const [error,setError]=useState('');
 useEffect(()=>{if(!snapshot)return;const poll=()=>{void refreshSnapshot().then(()=>setError('')).catch(e=>setError(e.message));};const timer=setInterval(poll,3000);return()=>clearInterval(timer);},[Boolean(snapshot)]);
 const trips:Trip[]=(snapshot?.trips||[]).map(mapTrip);const dispatch=async(id:string,event:TripEvent|((t:Trip)=>TripEvent|null))=>{try{const trip=trips.find(t=>t.id===id);if(!trip)throw new Error('Trip no longer available.');const e=typeof event==='function'?event(trip):event;if(!e)return;if(!['CANCEL','START_SEARCH'].includes(e.type))throw new Error('Only your assigned driver can update this stage.');await api(`bookings/${id}/action`,e.type==='CANCEL'?{action:'CANCEL',reason:e.reason}:{action:'RETRY'});await refreshSnapshot();setError('');}catch(e){setError((e as Error).message);throw e;}};
 return <TripsContext.Provider value={{trips,activeTrip:trips.find(isActive),nextScheduled:trips.filter(t=>t.stage==='scheduled').sort((a,b)=>+a.when-+b.when)[0],dispatch,addTrip:()=>{throw new Error('Use the server booking endpoint.');},updateTrip:()=>{throw new Error('Trip changes require the server.');},demoActive:false,setDemoActive:()=>{},error,refresh:refreshSnapshot}}>{children}</TripsContext.Provider>;}
export function useTrips(){const v=useContext(TripsContext);if(!v)throw new Error('TripsProvider missing');return v;}

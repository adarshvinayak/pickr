import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {api,getSnapshot,itemIds,vehicleIds,reverseId,upload} from './api';
import {checkSchedule} from './schedule';
import {type CategoryId, getItem, QUANTITY, VEHICLES, type VehicleId } from './catalog';
import type { OtherPerson } from './people';
import type { ScheduleInput } from './schedule';

export type Site = {
  /** What the customer sees and the driver reads; never raw coordinates. */
  label: string;
  source: 'gps' | 'manual' | 'map' | 'saved';
  coords?: { latitude: number; longitude: number };
};

export type BookingDraft = {
  /** Category the customer started from, used to open step 1 on the right group. */
  category?: CategoryId;
  itemId?: string;
  /** Units, bricks or blocks, depending on the material's measure. */
  quantity: number;
  /** Chosen truck; unset means "use the recommendation". */
  vehicleId?: VehicleId;
  pickup: Site | null;
  delivery: Site | null;
  notes: string;
  transitPass: string;
  /** Photo of the KOMPAS mineral transit pass (local URI), required before review for sand, jelly and soil. */
  transitPassPhoto?: string;
  when: { mode: 'now' } | ({ mode: 'schedule' } & ScheduleInput);
  /** Booking for someone else: who meets the truck and who pays the driver. Unset means "for me". */
  labourNeeded?:boolean;
  forOther?: OtherPerson | null;
};

const EMPTY: BookingDraft = {
  quantity: QUANTITY.units.initial,
  pickup: null,
  delivery: null,
  notes: '',
  transitPass: '',
  when: { mode: 'now' },
};

export const BOOKING_STEPS = 5;

/** Materials that need a transit pass get one more step (the pass upload) before review. */
export const stepsFor = (itemId?: string) => (getItem(itemId)?.transitPass ? BOOKING_STEPS + 1 : BOOKING_STEPS);

/** The pass is ready when it has both a number and a photo. */
export const passReady = (draft: BookingDraft) => draft.transitPass.trim().length >= 6 && Boolean(draft.transitPassPhoto);

const storageKey=()=>`pickr.draft.${getSnapshot()?.account.id||'signed-out'}`;

/** Booking routes in order; resuming pushes them all so Back walks the steps as usual. */
export const BOOKING_PATH = ['/book/material', '/book/route', '/book/site'] as const;

/** How far a draft got: 0 = nothing chosen, 1 = material, 2 = both sites too. */
export function draftProgress(draft: BookingDraft) {
  if (!draft.itemId) return 0;
  return draft.pickup && draft.delivery ? 2 : 1;
}

type BookingContextValue = {
  draft: BookingDraft;
  /** Fresh draft, optionally opened on a category or with a favourite site as delivery. */
  start: (options?: { category?: CategoryId; delivery?: Site; itemId?: string }) => void;
  /** A different material resets quantity to its default and clears the truck choice. */
  chooseItem: (itemId: string) => void;
  setQuantity: (quantity: number) => void;
  setVehicle: (vehicleId: VehicleId) => void;
  update: (patch: Partial<Pick<BookingDraft, 'labourNeeded' | 'pickup' | 'delivery' | 'notes' | 'transitPass' | 'transitPassPhoto' | 'when' | 'forOther' | 'labourNeeded'>>) => void;
  reset: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

/** One in-progress booking, kept while the customer moves back and forth between steps. */
export function BookingProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<BookingDraft>(EMPTY);
  const loaded = useRef(false);

  // An unfinished booking survives closing the app, like a cart.
  useEffect(() => {
    AsyncStorage.getItem(storageKey())
      .then((raw) => {
        if (raw) setDraft((current) => (current.itemId ? current : { ...EMPTY, ...(JSON.parse(raw) as Partial<BookingDraft>) }));
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    if (draftProgress(draft) === 0) AsyncStorage.removeItem(storageKey()).catch(() => {});
    else AsyncStorage.setItem(storageKey(), JSON.stringify(draft)).catch(() => {});
  }, [draft]);

  const start = useCallback<BookingContextValue['start']>((options) => {
    const item = getItem(options?.itemId);
    setDraft({
      ...EMPTY,
      category: item?.category ?? options?.category,
      itemId: item?.id,
      quantity: item ? QUANTITY[item.measure].initial : EMPTY.quantity,
      delivery: options?.delivery ?? null,
    });
  }, []);

  const chooseItem = useCallback((itemId: string) => {
    setDraft((d) => {
      const item = getItem(itemId);
      if (!item || d.itemId === itemId) return d;
      const sameMeasure = getItem(d.itemId)?.measure === item.measure;
      return {
        ...d,
        category: item.category,
        itemId,
        quantity: sameMeasure ? d.quantity : QUANTITY[item.measure].initial,
        vehicleId: undefined,
      };
    });
  }, []);

  const setQuantity = useCallback((quantity: number) => {
    setDraft((d) => {
      const item = getItem(d.itemId);
      const bounds = QUANTITY[item?.measure ?? 'units'];
      return { ...d, quantity: Math.min(bounds.max, Math.max(bounds.min, quantity)) };
    });
  }, []);

  const setVehicle = useCallback((vehicleId: VehicleId) => setDraft((d) => ({ ...d, vehicleId })), []);
  const update = useCallback<BookingContextValue['update']>((patch) => setDraft((d) => ({ ...d, ...patch })), []);
  const reset = useCallback(() => setDraft(EMPTY), []);

  const value = useMemo(
    () => ({ draft, start, chooseItem, setQuantity, setVehicle, update, reset }),
    [draft, start, chooseItem, setQuantity, setVehicle, update, reset]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const value = useContext(BookingContext);
  if (!value) throw new Error('useBooking must be used inside BookingProvider');
  return value;
}

/** The material, every truck quote for the quantity, and the one in force (chosen or recommended). */

let cachedQuote:{key:string;result:any;intake:any;at:number}|null=null;
let pendingQuote:{key:string;promise:Promise<any>}|null=null;
export async function getQuote(draft:BookingDraft){
 const point=(site:Site|null)=>{if(!site?.coords)throw new Error('Search for and confirm both sites on the map before continuing.');return {label:site.label.slice(0,200),address:site.label.slice(0,500),lat:site.coords.latitude,lng:site.coords.longitude};};
 const materialId=itemIds[draft.itemId||''];if(!materialId)throw new Error('This material is coming soon. Choose an available material.');
 const time=draft.when.mode==='schedule'?checkSchedule(draft.when):null;if(time&&!time.ok)throw new Error('Choose a future pickup time.');
 const intake:any={materialId,quantity:draft.quantity,pickup:point(draft.pickup),drop:point(draft.delivery),labourNeeded:Boolean((draft as any).labourNeeded),siteAccess:'normal',notes:draft.notes,transitPassNo:draft.transitPass,inputMode:'manual',...(time?.ok?{scheduledFor:time.date.toISOString()}:{}),...(draft.forOther?{forOther:draft.forOther}:{})};
 if(getSnapshot()?.settings.require_device_area){const {currentPoint}=await import('./geocode');const gps=await currentPoint();if(!gps.ok)throw new Error('Allow location to check the service area.');intake.deviceLocation={lat:gps.point.latitude,lng:gps.point.longitude,sampledAt:new Date().toISOString()};}
 const key=getSnapshot()?.account.id+JSON.stringify(intake);if(cachedQuote?.key===key&&Date.now()-cachedQuote.at<480000)return cachedQuote;
 if(pendingQuote?.key===key)return pendingQuote.promise;
 const promise=api('quote',intake).then(result=>{cachedQuote={key,result,intake,at:Date.now()};return cachedQuote;}).finally(()=>{pendingQuote=null;});pendingQuote={key,promise};return promise;
}
export async function submitBooking(draft:BookingDraft,requestKey:string){const q=await getQuote(draft);const vehicleTypeId=vehicleIds[draft.vehicleId||reverseId(vehicleIds,q.result.recommendedId)];let transitPassPhoto:string|undefined;if(draft.transitPassPhoto)transitPassPhoto=await upload(draft.transitPassPhoto,'pass');return api('bookings',{...q.intake,transitPassPhoto,vehicleTypeId,quoteToken:q.result.quoteToken,requestKey});}
export function useQuote(){const {draft}=useBooking();const item=getItem(draft.itemId);const [result,setResult]=useState<any>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const key=JSON.stringify(draft);useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(!active||!item)return null;setResult(null);setBusy(true);return getQuote(draft);}).then(q=>{if(active&&q){setResult(q.result);setError('');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[key]);const quotes=(result?.options||[]).map((o:any)=>({vehicle:VEHICLES[reverseId(vehicleIds,o.vehicle.id) as VehicleId],loads:1,total:o.quote.totalFare,range:{low:o.quote.totalFare,high:o.quote.totalFare},breakdown:o.quote})).filter((q:any)=>q.vehicle);quotes.sort((a:any,b:any)=>Number(b.vehicle.id===reverseId(vehicleIds,result?.recommendedId))-Number(a.vehicle.id===reverseId(vehicleIds,result?.recommendedId)));const chosen=quotes.find((q:any)=>q.vehicle.id===draft.vehicleId)||quotes[0];return {item,quotes,chosen,error,busy,route:result?.route};}

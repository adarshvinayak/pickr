import {afterEach,describe,expect,it,vi} from 'vitest';
import {mountMap} from '@/lib/pilot/map-container';
import {repeatTripDetails} from '@/lib/pilot/repeat-trip';
import type {MapplsSDK} from '@/lib/pilot/mappls-client';
import type {Trip} from '@/lib/pilot/model';
describe('booking and SDK remount regressions',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it('avoids the SDK double-destroy path when a removed map is reopened',()=>{
  vi.stubGlobal('document',{createElement:()=>({id:'',style:{}})});const parent={replaceChildren:vi.fn()} as unknown as HTMLElement;
  let last:{id:string;remove:()=>void}|undefined;const ids:string[]=[];
  class ProviderMap{constructor(public id:string){if(last?.id===id)last.remove();ids.push(id);last={id,remove:()=>this.remove()};}removed=false;remove(){if(this.removed)throw Error("Cannot read properties of undefined (reading 'destroy')");this.removed=true;}}
  const sdk={Map:ProviderMap} as unknown as MapplsSDK;
  const first=mountMap(sdk,parent,{});first.remove();expect(()=>mountMap(sdk,parent,{})).not.toThrow();expect(ids[0]).not.toBe(ids[1]);
 });
 it('repeats load/sites/instructions but never reuses old fare, time or transit pass',()=>{const trip={payload:{materialId:'m_sand',quantity:2,pickup:{lat:10,lng:76,label:'A',address:'A'},drop:{lat:11,lng:77,label:'B',address:'B'},labourNeeded:false,siteAccess:'normal',notes:'Gate 2',quote:{totalFare:999},scheduledFor:'2020-01-01',transitPassNo:'OLD-PASS'}} as unknown as Trip;const result=repeatTripDetails(trip);expect(result.quantity).toBe(2);expect(result.pickup).toEqual(trip.payload.pickup);expect(result.drop).toEqual(trip.payload.drop);expect(result.notes).toBe('Gate 2');expect(result.scheduledFor).toBe('');expect(result.transitPassNo).toBe('');expect(result).not.toHaveProperty('quote');});
});

import {describe,it,expect} from 'vitest';
import {inPolygon,serviceable,searchRadius,photoRequirement} from '@/lib/pilot/geo';
import {parseWithLocalRules} from '@/lib/voice-parser';
import {calculateQuote,getSurgeMultiplier} from '@/lib/pricing';
import {selectVehicle} from '@/lib/vehicle-select';
describe('Real pilot rules',()=>{
 const polygon:[number,number][]=[[76.1,10.4],[76.3,10.4],[76.3,10.6],[76.1,10.6]];
 it('includes an exact boundary but excludes outside/disabled areas',()=>{expect(inPolygon({lat:10.5,lng:76.2},polygon)).toBe(true);expect(inPolygon({lat:10.4,lng:76.2},polygon)).toBe(true);expect(inPolygon({lat:10.8,lng:76.2},polygon)).toBe(false);expect(serviceable({lat:10.5,lng:76.2},[{id:'zone',name:'Thrissur',polygon,active:false}])).toBe(false);});
 it('expands exactly once per minute during a five-minute search',()=>{expect([0,59999,60000,120000,180000,240000,300000].map(t=>searchRadius(t,5,5))).toEqual([5,5,10,15,20,25,25]);});
 it('requires two photos or an enabled, explicit skip',()=>{expect(photoRequirement(0,false,true)).toBe(false);expect(photoRequirement(1,false,true)).toBe(false);expect(photoRequirement(2,false,false)).toBe(true);expect(photoRequirement(0,true,true)).toBe(true);expect(photoRequirement(0,true,false)).toBe(false);});
 it('does not overwrite cargo quantity when customer answers a time question',()=>{const first=parseWithLocalRules('30 bags cement from Thrissur yard to Ollur site');const next=parseWithLocalRules('in 2 hours',first);expect(next.quantity).toBe(30);expect(next.pickupText).toBe('Thrissur yard');expect(next.dropText).toBe('Ollur site');expect(next.when).not.toBeNull();});
 it('supports corrections without inventing place coordinates',()=>{const first=parseWithLocalRules('one load of M-sand');expect(first.quantity).toBe(1);expect(first.nextQuestion?.slot).toBe('pickupLocation');const next=parseWithLocalRules('no, make it 2 loads',first);expect(next.quantity).toBe(2);expect(next.pickupText).toBeNull();});
 it('asks missing labour and access questions before confirmation',()=>{let slots=parseWithLocalRules('30 bags cement from Thrissur to Ollur now');expect(slots.nextQuestion?.slot).toBe('labour');slots=parseWithLocalRules('No helpers',slots);expect(slots.nextQuestion?.slot).toBe('siteAccess');slots=parseWithLocalRules('Normal road access',slots);expect(slots.readyToConfirm).toBe(true);});
 it('prices in Kerala time independently of server timezone',()=>{expect(getSurgeMultiplier(new Date('2026-10-10T03:30:00Z')).multiplier).toBe(1.1);expect(getSurgeMultiplier(new Date('2026-10-10T18:00:00Z')).multiplier).toBe(1.2);});
 it('charges only waiting beyond 30 minutes at each end',()=>{const base={vehicleTypeId:'tata_ace',distanceKm:3,scheduledFor:'2026-10-10T08:30:00Z'};expect(calculateQuote({...base,waitingMinutesPickup:30,waitingMinutesDrop:30}).waitingFare).toBe(0);expect(calculateQuote({...base,waitingMinutesPickup:35,waitingMinutesDrop:32}).waitingFare).toBe(28);});
 it('never offers an override smaller than the recommended protected truck',()=>{const selected=selectVehicle('cement',30);expect(selected.allowedVehicles.every(v=>v.capacityKg>=selected.vehicle.capacityKg)).toBe(true);});
});

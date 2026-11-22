import {describe,expect,it} from 'vitest';
import {repeatTripDetails} from '@/lib/pilot/repeat-trip';
import type {Trip} from '@/lib/pilot/model';
describe('booking regressions',()=>{
 it('repeats load/sites/instructions but never reuses old fare, time or transit pass',()=>{const trip={payload:{materialId:'m_sand',quantity:2,pickup:{lat:10,lng:76,label:'A',address:'A'},drop:{lat:11,lng:77,label:'B',address:'B'},labourNeeded:false,siteAccess:'normal',notes:'Gate 2',quote:{totalFare:999},scheduledFor:'2020-01-01',transitPassNo:'OLD-PASS'}} as unknown as Trip;const result=repeatTripDetails(trip);expect(result.quantity).toBe(2);expect(result.pickup).toEqual(trip.payload.pickup);expect(result.drop).toEqual(trip.payload.drop);expect(result.notes).toBe('Gate 2');expect(result.scheduledFor).toBe('');expect(result.transitPassNo).toBe('');expect(result).not.toHaveProperty('quote');});
});

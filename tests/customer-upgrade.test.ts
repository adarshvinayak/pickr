import {describe,it,expect,vi,beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
const insert=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/pilot/server',()=>({database:()=>({from:()=>({insert})}),audit:vi.fn(),ApiError:class extends Error{constructor(public status:number,message:string){super(message);}},check:vi.fn(),identity:vi.fn(),json:vi.fn()}));
import {submitRating} from '@/lib/pilot/customer';
import type {Trip,Account} from '@/lib/pilot/model';
const actor={id:'customer',role:'customer'} as Account;
const trip={id:'trip',customer_id:'customer',driver_id:'driver',status:'COMPLETED',payment_status:'paid'} as Trip;
const request=new NextRequest('http://localhost/api/bookings/trip/action');
beforeEach(()=>insert.mockReset().mockResolvedValue({error:null}));
describe('Two-sided ratings',()=>{
 it('stores the customer rating against the assigned driver',async()=>{await submitRating(request,'trip',actor,trip,{rating:5,comment:'Helpful'});expect(insert).toHaveBeenCalledWith(expect.objectContaining({author_id:'customer',subject_id:'driver',rating:5}));});
 it('stores the driver rating against the booking customer',async()=>{await submitRating(request,'trip',{id:'driver',role:'driver'} as Account,trip,{rating:4});expect(insert).toHaveBeenCalledWith(expect.objectContaining({author_id:'driver',subject_id:'customer',rating:4}));});
 it('requires payment completion',async()=>{await expect(submitRating(request,'trip',actor,{...trip,payment_status:'pending'},{rating:5})).rejects.toThrow(/payment/);expect(insert).not.toHaveBeenCalled();});
 it('rejects a different participant or admin',async()=>{for(const a of [{id:'stranger',role:'customer'},{id:'admin',role:'admin'}])await expect(submitRating(request,'trip',a as Account,trip,{rating:5})).rejects.toThrow(/Only/);expect(insert).not.toHaveBeenCalled();});
 it('rejects invalid ratings',async()=>{await expect(submitRating(request,'trip',actor,trip,{rating:6})).rejects.toThrow();expect(insert).not.toHaveBeenCalled();});
 it('does not overwrite an existing rating',async()=>{insert.mockResolvedValue({error:{code:'23505'}});await expect(submitRating(request,'trip',actor,trip,{rating:4})).rejects.toThrow(/already/);});
});

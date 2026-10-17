import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {TripView} from '@/components/pilot/TripView';
import {SchedulePicker} from '@/components/pilot/SchedulePicker';
import type {Settings,Trip} from '@/lib/pilot/model';
describe('customer booking layout contracts',()=>{
 it('places driver status and ETA before the tracking map',()=>{const now=new Date().toISOString();const site={lat:10.53,lng:76.21,label:'Test site',address:'Test road'};const trip={id:'qa',short_code:'QA',status:'ACCEPTED',payment_status:'pending',search_started_at:now,payload:{pickup:site,drop:site,materialId:'m_sand',vehicleTypeId:'tipper_100',quantity:1,unit:'unit',quote:{totalFare:1000},scheduledFor:now,customerName:'QA',customerPhone:'9000000000'},driver:{name:'QA Driver',phone:'9000000001',vehicle_number:'QA-TEST',lat:10.53,lng:76.21,accuracy:5,position_at:now},navigation:{updated_at:now,result:{durationMin:5,distanceKm:1,eta:now,reports:[],trafficMode:'traffic_eta'}}} as unknown as Trip;const html=renderToStaticMarkup(createElement(TripView,{trip,role:'customer',settings:{allow_skips:true,support_phone:''} as Settings,zones:[],refresh:()=>{}}));expect(html.indexOf('Driver coming to pickup')).toBeLessThan(html.indexOf('Interactive Mappls road map'));expect(html.indexOf('About 5 min')).toBeLessThan(html.indexOf('Interactive Mappls road map'));});
 it('shows seven date choices and preserves minute precision in time rollers',()=>{const html=renderToStaticMarkup(createElement(SchedulePicker,{value:new Date(Date.now()+86400000).toISOString().replace(/:\d{2}\.\d{3}Z$/,':00.000Z'),onChange:()=>{}}));expect(html.match(/aria-pressed=/g)).toHaveLength(7);expect(html).toContain('role="listbox" aria-label="Hour"');expect(html).toContain('role="listbox" aria-label="Minute"');expect(html).toContain('India Standard Time');});
});

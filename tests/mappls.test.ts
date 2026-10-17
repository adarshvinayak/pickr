import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {calculateRoute,geocodeAddress,reverseGeocode,parseRoute,parseStandardRoute,TruckSchema} from '@/lib/mappls';
import {decodePolyline,routeDeviationMeters} from '@/lib/pilot/navigation-geo';
function encode(points:[number,number][]){let oldLat=0,oldLng=0;let out='';for(const [lng,lat] of points){const a=Math.round(lat*1e6),b=Math.round(lng*1e6);for(const delta of [a-oldLat,b-oldLng]){let value=delta<0?~(delta<<1):delta<<1;while(value>=32){out+=String.fromCharCode((32|(value&31))+63);value>>=5;}out+=String.fromCharCode(value+63);}oldLat=a;oldLng=b;}return out;}
const coordinates:[number,number][]=[[76.2144,10.5276],[76.22,10.53]];
const response={trip:{status:0,summary:{length:1.42,time:125,has_time_restrictions:true},legs:[{shape:encode(coordinates),maneuvers:[{instruction:'Turn left.'}]}]}};
const truck={height:3.1,width:2.2,length:6.5,weight:8,axle_load:4};
beforeEach(()=>{vi.stubEnv('MAPPLS_REST_KEY','test-server-key');vi.stubEnv('MAPPLS_ROUTING_MODE','predictive');vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(response),{status:200})));});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('Mappls routing and geometry',()=>{
 it('puts available neighbourhood details before the road without house or shop names',async()=>{vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({results:[{street:'Premji Road',subSubLocality:'Bini Junction',subLocality:'Patturikkal',city:'Thrissur',district:'Thrissur District',state:'Kerala',pincode:'680001',houseNumber:'123',poi:'Private Store'}]})));const p=await reverseGeocode(10.53,76.21);expect(p.address).toBe('Bini Junction, Patturikkal, Premji Road, Thrissur, Thrissur District, Kerala, PIN 680001');expect(p.address).not.toMatch(/Private Store|123/);});
 it('uses the enabled standard traffic ETA API by default, with metres converted to kilometres',async()=>{
  vi.stubEnv('MAPPLS_ROUTING_MODE','');vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({code:'Ok',routes:[{distance:1036.4,duration:169,geometry:{type:'LineString',coordinates}}]})));
  const route=await calculateRoute(coordinatesPoint(0),coordinatesPoint(1),{truck,scheduledFor:'2099-01-01T00:00:00Z',avoid:[coordinatesPoint(0)]});
  const url=new URL(vi.mocked(fetch).mock.calls[0][0] as URL);
  expect(url.pathname).toContain('/route/direction/route_eta/trucking/');expect(url.searchParams.get('geometries')).toBe('geojson');
  expect(url.searchParams.has('weight')).toBe(false);expect(url.searchParams.has('date_time')).toBe(false);expect(url.searchParams.has('avoid_locations')).toBe(false);
  expect(route).toMatchObject({distanceKm:1.1,durationMin:3,durationSeconds:169,trafficMode:'traffic_eta',restrictionsApplied:false});expect(JSON.parse(route.polyline)).toEqual(coordinates);
 });
 it('rejects standard no-route responses and invalid coordinate geometry',()=>{
  expect(()=>parseStandardRoute({code:'NoRoute',routes:[]},'driving')).toThrow();
  expect(()=>parseStandardRoute({code:'Ok',routes:[{distance:10,duration:2,geometry:{type:'LineString',coordinates:[[200,10],[76,10]]}}]},'driving')).toThrow();
 });
 it('does not silently switch endpoints after predictive access is denied',async()=>{
  vi.mocked(fetch).mockResolvedValue(new Response('',{status:401}));await expect(calculateRoute(coordinatesPoint(0),coordinatesPoint(1))).rejects.toThrow('access denied');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('decodes polyline6 into longitude/latitude without reversing Kerala coordinates',()=>{expect(decodePolyline(encode(coordinates))).toEqual(coordinates);expect(()=>decodePolyline('~')).toThrow();});
 it('uses live traffic, current departure and actual truck restrictions',async()=>{const route=await calculateRoute({lat:10.5276,lng:76.2144},{lat:10.53,lng:76.22},{truck});const url=new URL(vi.mocked(fetch).mock.calls[0][0] as URL);expect(url.hostname).toBe('route.mappls.com');expect(url.searchParams.get('profile')).toBe('trucking');expect(url.searchParams.get('weight')).toBe('8');expect(url.searchParams.get('axle_load')).toBe('4');expect(url.searchParams.get('date_time')).toBe('0,""');expect(url.searchParams.get('speedTypes')).toBe('traffic');expect(route).toMatchObject({durationMin:3,distanceKm:1.5,restrictionsApplied:true,hasTimeRestrictions:true});});
 it('never applies provider default heavy-truck dimensions to an unknown test vehicle',async()=>{const result=await calculateRoute(coordinatesPoint(0),coordinatesPoint(1));expect(result.restrictionsApplied).toBe(false);const url=new URL(vi.mocked(fetch).mock.calls[0][0] as URL);expect(url.searchParams.get('profile')).toBe('driving');expect(url.searchParams.has('weight')).toBe(false);});
 it('uses Kerala local departure time for scheduled predictive quotes',async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-10T00:00:00Z'));try{await calculateRoute(coordinatesPoint(0),coordinatesPoint(1),{scheduledFor:'2026-10-10T05:00:00Z',avoid:[{lat:10.528,lng:76.215}]});const url=new URL(vi.mocked(fetch).mock.calls[0][0] as URL);expect(url.searchParams.get('date_time')).toBe('1,2026-10-10T10:30');expect(url.searchParams.get('speedTypes')).toBe('predictive');expect(JSON.parse(url.searchParams.get('avoid_locations')!)).toEqual([{lat:10.528,lon:76.215}]);}finally{vi.useRealTimers();}});
 it('rejects unavailable or malformed routes instead of fabricating distances',()=>{expect(()=>parseRoute({routes:[]},'driving','traffic')).toThrow();expect(()=>TruckSchema.parse({...truck,weight:0})).toThrow();});
 it('does not fall back to a second provider after access failures',async()=>{vi.mocked(fetch).mockResolvedValue(new Response('',{status:403}));await expect(calculateRoute(coordinatesPoint(0),coordinatesPoint(1))).rejects.toThrow('access denied');expect(fetch).toHaveBeenCalledTimes(1);});
 it('measures deviation against route segments, not just vertices',()=>{const line=JSON.stringify([[76.21,10.52],[76.23,10.52]]);expect(routeDeviationMeters({lat:10.52,lng:76.22},line)).toBeLessThan(1);expect(routeDeviationMeters({lat:10.522,lng:76.22},line)).toBeGreaterThan(200);expect(routeDeviationMeters({lat:10.52,lng:76.22},'invalid')).toBe(Infinity);});
 it('resolves eLoc search results with entitled Place Details coordinates',async()=>{vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({copResults:{eLoc:'ABC123',formattedAddress:'Thrissur'}}))).mockResolvedValueOnce(new Response(JSON.stringify({latitude:'10.5276',longitude:'76.2144'})));expect(await geocodeAddress('Thrissur')).toEqual([{id:'ABC123',label:'Thrissur',address:'Thrissur',lat:10.5276,lng:76.2144}]);expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain('/place-details/ABC123');});
 it('explains missing coordinate entitlement without substituting a city centre',async()=>{vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({copResults:{eLoc:'ABC123'}}))).mockResolvedValueOnce(new Response(JSON.stringify({name:'Thrissur'})));await expect(geocodeAddress('Thrissur')).rejects.toThrow('Location Coordinates');});
});
function coordinatesPoint(index:number){return {lng:coordinates[index][0],lat:coordinates[index][1]};}

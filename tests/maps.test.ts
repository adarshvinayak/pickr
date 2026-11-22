import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {calculateRoute,geocodeAddress,reverseGeocode,parseRoute,TruckSchema,mapPublicKey} from '@/lib/maps';
import {decodePolyline,routeDeviationMeters} from '@/lib/pilot/navigation-geo';
/** Google encoded polyline (precision 5). */
function encode(points:[number,number][],precision=5){const f=10**precision;let oldLat=0,oldLng=0;let out='';for(const [lng,lat] of points){const a=Math.round(lat*f),b=Math.round(lng*f);for(const delta of [a-oldLat,b-oldLng]){let value=delta<0?~(delta<<1):delta<<1;while(value>=32){out+=String.fromCharCode((32|(value&31))+63);value>>=5;}out+=String.fromCharCode(value+63);}oldLat=a;oldLng=b;}return out;}
const coordinates:[number,number][]=[[76.2144,10.5276],[76.22,10.53]];
const routeResponse={routes:[{distanceMeters:1036,duration:'169s',polyline:{encodedPolyline:encode(coordinates)},legs:[{steps:[{navigationInstruction:{instructions:'Turn left onto Premji Road'}}]}]}]};
const truck={height:3.1,width:2.2,length:6.5,weight:8,axle_load:4};
const pointA={lng:coordinates[0][0],lat:coordinates[0][1]},pointB={lng:coordinates[1][0],lat:coordinates[1][1]};
const ok=(body:unknown)=>new Response(JSON.stringify(body),{status:200});
beforeEach(()=>{vi.stubEnv('GOOGLE_MAPS_SERVER_KEY','test-server-key');vi.stubEnv('GOOGLE_MAPS_WEB_KEY','test-web-key');vi.stubGlobal('fetch',vi.fn(async()=>ok(routeResponse)));});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
const call=(i=0)=>{const [url,init]=vi.mocked(fetch).mock.calls[i] as [string,RequestInit];return {url:new URL(String(url)),init,headers:init.headers as Record<string,string>,body:init.body?JSON.parse(String(init.body)):undefined};};

describe('Google routing',()=>{
 it('asks the Routes API for a traffic-aware driving route and converts units',async()=>{
  const route=await calculateRoute(pointA,pointB);const c=call();
  expect(c.url.hostname).toBe('routes.googleapis.com');expect(c.headers['X-Goog-Api-Key']).toBe('test-server-key');
  expect(c.headers['X-Goog-FieldMask']).toContain('routes.polyline.encodedPolyline');
  expect(c.body).toMatchObject({travelMode:'DRIVE',routingPreference:'TRAFFIC_AWARE',origin:{location:{latLng:{latitude:10.5276,longitude:76.2144}}}});expect(c.body.departureTime).toBeUndefined();
  expect(route).toMatchObject({distanceKm:1.1,durationMin:3,durationSeconds:169,trafficMode:'traffic',profile:'driving',restrictionsApplied:false,instructions:['Turn left onto Premji Road']});
  expect(JSON.parse(route.polyline)).toEqual(coordinates);
 });
 it('sends a future departure time and labels it predictive',async()=>{
  const route=await calculateRoute(pointA,pointB,{scheduledFor:'2099-01-01T00:00:00Z'});
  expect(call().body.departureTime).toBe('2099-01-01T00:00:00.000Z');expect(route.trafficMode).toBe('predictive');
 });
 it('ignores a past scheduled time rather than sending an invalid departure',async()=>{await calculateRoute(pointA,pointB,{scheduledFor:'2020-01-01T00:00:00Z'});expect(call().body.departureTime).toBeUndefined();});
 it('never claims truck restrictions were applied, but still rejects a bad vehicle profile',async()=>{
  const route=await calculateRoute(pointA,pointB,{truck,avoid:[pointA]});expect(route.restrictionsApplied).toBe(false);
  await expect(calculateRoute(pointA,pointB,{truck:{...truck,weight:0}})).rejects.toThrow();
 });
 it('fails clearly on access/quota errors without a second provider call',async()=>{
  vi.mocked(fetch).mockResolvedValue(new Response('',{status:403}));await expect(calculateRoute(pointA,pointB)).rejects.toThrow('access denied');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('rejects empty or malformed routes instead of fabricating distances',()=>{
  expect(()=>parseRoute({},'traffic')).toThrow();expect(()=>parseRoute({routes:[]},'traffic')).toThrow();
  expect(()=>parseRoute({routes:[{distanceMeters:10,duration:'five',polyline:{encodedPolyline:'abc'}}]},'traffic')).toThrow();
  expect(()=>parseRoute({routes:[{distanceMeters:10,duration:'5s',polyline:{encodedPolyline:'~'}}]},'traffic')).toThrow();
 });
 it('reports a missing key as a configuration error',async()=>{vi.stubEnv('GOOGLE_MAPS_SERVER_KEY','your-google-key');await expect(calculateRoute(pointA,pointB)).rejects.toThrow('GOOGLE_MAPS_SERVER_KEY');expect(()=>{vi.stubEnv('GOOGLE_MAPS_WEB_KEY','');mapPublicKey();}).toThrow('GOOGLE_MAPS_WEB_KEY');});
});

describe('Google place search',()=>{
 it('returns named places with coordinates, biased to the pilot area and India',async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(ok({places:[{id:'ChIJ1',displayName:{text:'Ollur Railway Station'},formattedAddress:'Ollur, Thrissur, Kerala',location:{latitude:10.4784,longitude:76.2263}}]}));
  expect(await geocodeAddress('Ollur station')).toEqual([{id:'ChIJ1',label:'Ollur Railway Station',address:'Ollur, Thrissur, Kerala',lat:10.4784,lng:76.2263}]);
  const c=call();expect(c.url.href).toBe('https://places.googleapis.com/v1/places:searchText');expect(c.body).toMatchObject({textQuery:'Ollur station',regionCode:'IN'});expect(c.body.locationBias.circle.center.latitude).toBeCloseTo(10.5276);
  expect(c.headers['X-Goog-FieldMask']).toContain('places.location');
 });
 it('returns no results (not a fake city centre) when nothing matches',async()=>{vi.mocked(fetch).mockResolvedValueOnce(ok({}));expect(await geocodeAddress('zzzz')).toEqual([]);});
 it('rejects a place with out-of-range coordinates',async()=>{vi.mocked(fetch).mockResolvedValueOnce(ok({places:[{id:'x',location:{latitude:200,longitude:76}}]}));await expect(geocodeAddress('bad')).rejects.toThrow();});
});

describe('Google address lookup',()=>{
 const premji={status:'OK',results:[{address_components:[{long_name:'123',types:['street_number']},{long_name:'Private Store',types:['establishment','point_of_interest']},{long_name:'Premji Road',types:['route']},{long_name:'Bini Junction',types:['sublocality_level_2','sublocality','political']},{long_name:'Patturikkal',types:['sublocality_level_1','sublocality','political']},{long_name:'Thrissur',types:['locality','political']},{long_name:'Thrissur',types:['administrative_area_level_3','political']},{long_name:'Kerala',types:['administrative_area_level_1','political']},{long_name:'680001',types:['postal_code']}]}]};
 it('puts neighbourhood details before the road without house numbers or shop names',async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(ok(premji));const p=await reverseGeocode(10.53,76.21);
  expect(p.address).toBe('Bini Junction, Patturikkal, Premji Road, Thrissur, Kerala, PIN 680001');expect(p.address).not.toMatch(/Private Store|123/);expect(p.label).toBe('Bini Junction, Premji Road');
  expect(call().url.searchParams.get('latlng')).toBe('10.53,76.21');expect(call().url.searchParams.get('key')).toBe('test-server-key');
 });
 it('retries without the type filter when the first lookup finds nothing',async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(ok({status:'ZERO_RESULTS',results:[]})).mockResolvedValueOnce(ok(premji));
  await reverseGeocode(10.53,76.21);expect(fetch).toHaveBeenCalledTimes(2);expect(call(0).url.searchParams.has('result_type')).toBe(true);expect(call(1).url.searchParams.has('result_type')).toBe(false);
 });
 it('treats Google status errors returned with HTTP 200 as access failures',async()=>{vi.mocked(fetch).mockResolvedValueOnce(ok({status:'REQUEST_DENIED',results:[]}));await expect(reverseGeocode(10.5,76.2)).rejects.toThrow('access denied');});
 it('says so when no address exists for the pin',async()=>{vi.mocked(fetch).mockImplementation(async()=>ok({status:'ZERO_RESULTS',results:[]}));await expect(reverseGeocode(0,0)).rejects.toThrow('Address unavailable');});
});

describe('route geometry',()=>{
 it('decodes polyline5 and polyline6 into longitude/latitude without reversing Kerala coordinates',()=>{expect(decodePolyline(encode(coordinates,5),5)).toEqual(coordinates);expect(decodePolyline(encode(coordinates,6))).toEqual(coordinates);expect(()=>decodePolyline('~')).toThrow();});
 it('measures deviation against route segments, not just vertices',()=>{const line=JSON.stringify([[76.21,10.52],[76.23,10.52]]);expect(routeDeviationMeters({lat:10.52,lng:76.22},line)).toBeLessThan(1);expect(routeDeviationMeters({lat:10.522,lng:76.22},line)).toBeGreaterThan(200);expect(routeDeviationMeters({lat:10.52,lng:76.22},'invalid')).toBe(Infinity);});
 it('validates truck measurement bounds',()=>{expect(TruckSchema.parse(truck)).toEqual(truck);expect(()=>TruckSchema.parse({...truck,height:0})).toThrow();});
});

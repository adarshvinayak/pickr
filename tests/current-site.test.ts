import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({gps:vi.fn(),api:vi.fn()}));
vi.mock('@/lib/pilot/client',()=>({currentLocation:mocks.gps,api:mocks.api}));
describe('current pickup location',()=>{
 beforeEach(()=>{vi.resetModules();vi.clearAllMocks();mocks.gps.mockReset();mocks.api.mockReset();vi.useFakeTimers();});
 afterEach(()=>vi.useRealTimers());
 const fix={lat:10.5276,lng:76.2144,accuracy:8,sampledAt:'2026-10-23T10:00:00Z'};
 const address={lat:fix.lat,lng:fix.lng,label:'Swaraj Round',address:'Thrissur, Kerala, 680001'};
 it('shares one GPS and address request between dashboard and pickup',async()=>{
  mocks.gps.mockResolvedValue(fix);mocks.api.mockResolvedValue(address);
  const {currentSite}=await import('@/lib/pilot/current-site');
  const [home,pickup]=await Promise.all([currentSite(),currentSite()]);
  expect(home).toEqual(address);expect(pickup).toEqual(address);expect(mocks.gps).toHaveBeenCalledTimes(1);expect(mocks.api).toHaveBeenCalledTimes(1);
  await currentSite();expect(mocks.gps).toHaveBeenCalledTimes(1);
 });
 it('refreshes an expired fix rather than using old GPS as pickup',async()=>{
  mocks.gps.mockResolvedValue(fix);mocks.api.mockResolvedValue(address);
  const {currentSite}=await import('@/lib/pilot/current-site');await currentSite();vi.advanceTimersByTime(60_001);await currentSite();expect(mocks.gps).toHaveBeenCalledTimes(2);
 });
 it('keeps real GPS available when reverse lookup fails',async()=>{
  mocks.gps.mockResolvedValue(fix);mocks.api.mockRejectedValue(new Error('Provider unavailable'));
  const {currentSite}=await import('@/lib/pilot/current-site');const p=await currentSite();expect(p.lat).toBe(fix.lat);expect(p.lng).toBe(fix.lng);expect(p.address).toContain('Address unavailable');
 });
 it('reports denied GPS and lets the next user attempt retry',async()=>{
  mocks.gps.mockRejectedValueOnce(new Error('Location permission is blocked')).mockResolvedValue(fix);mocks.api.mockResolvedValue(address);
  const {currentSite}=await import('@/lib/pilot/current-site');await expect(currentSite()).rejects.toThrow('permission');expect(mocks.api).not.toHaveBeenCalled();await expect(currentSite()).resolves.toEqual(address);
 });
});

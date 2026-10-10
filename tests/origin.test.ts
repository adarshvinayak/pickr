import {describe,it,expect} from 'vitest';
import {allowedRequestOrigin} from '@/lib/pilot/origin';
describe('Pilot web/native origins',()=>{
 it('allows localhost and LAN requests when Next binds to all interfaces',()=>{
  expect(allowedRequestOrigin('http://localhost:3000','http://0.0.0.0:3000','localhost:3000')).toBe(true);
  expect(allowedRequestOrigin('http://192.168.1.10:3000','http://0.0.0.0:3000','192.168.1.10:3000')).toBe(true);
 });
 it('allows the bundled Android host and configured HTTPS deployment',()=>{
  expect(allowedRequestOrigin('https://appassets.androidplatform.net','http://localhost:3000','localhost:3000')).toBe(true);
  expect(allowedRequestOrigin('https://pickr.example','http://localhost:3000','localhost:3000','https://pickr.example/')).toBe(true);
 });
 it('rejects unrelated origins, deceptive suffixes and different ports',()=>{
  for(const origin of ['https://evil.example','http://localhost:3000.evil.example','http://localhost:3001','null'])expect(allowedRequestOrigin(origin,'http://0.0.0.0:3000','localhost:3000')).toBe(false);
 });
 it('allows origin-free native HTTP clients',()=>{expect(allowedRequestOrigin(null,'http://localhost:3000','localhost:3000')).toBe(true);});
});

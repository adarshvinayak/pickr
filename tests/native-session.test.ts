import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {setToken,token,useRole} from '@/lib/pilot/client';
describe('native and web session persistence',()=>{
 let nativeSession='';let values:Map<string,string>;
 beforeEach(()=>{nativeSession='';values=new Map();useRole('customer');vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value)});vi.stubGlobal('window',{PickrNative:{getSessionToken:()=>nativeSession,setSessionToken:(value:string)=>{nativeSession=value;}}});});
 afterEach(()=>vi.unstubAllGlobals());
 it('uses the durable Android session when WebView storage has an older session',()=>{nativeSession='current-native-session';values.set('pickr-customer-token','stale-webview-session');expect(token()).toBe('current-native-session');});
 it('updates both stores on login and clears both on logout',()=>{setToken('new-session');expect(nativeSession).toBe('new-session');expect(values.get('pickr-customer-token')).toBe('new-session');setToken('');expect(token()).toBe('');expect(nativeSession).toBe('');expect(values.get('pickr-customer-token')).toBe('');});
 it('does not revive a stale WebView session after the native session is cleared',()=>{values.set('pickr-customer-token','stale-webview-session');expect(token()).toBe('');});
 it('preserves separate customer and driver storage in a browser',()=>{vi.stubGlobal('window',{});setToken('customer-session');useRole('driver');setToken('driver-session');expect(token()).toBe('driver-session');useRole('customer');expect(token()).toBe('customer-session');});
});

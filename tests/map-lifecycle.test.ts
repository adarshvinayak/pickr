import {afterEach,describe,expect,it,vi} from 'vitest';
import {mapLifecycle} from '@/lib/pilot/map-lifecycle';
import type {MapInstance} from '@/lib/pilot/mappls-client';
function fixture(ready=false){const listeners=new Map<string,()=>void>();const remove=vi.fn();const map={addListener:(name:string,fn:()=>void)=>listeners.set(name,fn),loaded:()=>ready,remove} as unknown as MapInstance;return {map,remove,load:()=>listeners.get('load')?.()};}
describe('Mappls asynchronous teardown',()=>{
 afterEach(()=>vi.useRealTimers());
 it('waits for initialization when a screen is left before load',()=>{vi.useFakeTimers();const f=fixture();const ready=vi.fn();const life=mapLifecycle(f.map,ready);life.dispose();expect(f.remove).not.toHaveBeenCalled();f.load();expect(f.remove).toHaveBeenCalledTimes(1);expect(ready).not.toHaveBeenCalled();vi.runAllTimers();expect(f.remove).toHaveBeenCalledTimes(1);});
 it('removes a loaded map once even with repeated cleanup',()=>{const f=fixture(true);const life=mapLifecycle(f.map,vi.fn());expect(life.active()).toBe(true);life.dispose();life.dispose();f.load();expect(f.remove).toHaveBeenCalledTimes(1);expect(life.active()).toBe(false);});
 it('retries cleanup after a late load if early fallback could not remove the partial map',()=>{vi.useFakeTimers();const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});const f=fixture();f.remove.mockImplementationOnce(()=>{throw Error('handlers undefined');});const life=mapLifecycle(f.map,vi.fn());life.dispose();vi.runAllTimers();f.load();f.load();expect(f.remove).toHaveBeenCalledTimes(2);warning.mockRestore();});
 it('bounds cleanup if the SDK never finishes and contains provider teardown failures',()=>{vi.useFakeTimers();const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});const f=fixture();f.remove.mockImplementation(()=>{throw Error('this.handlers is undefined');});const life=mapLifecycle(f.map,vi.fn());life.dispose();expect(()=>vi.runAllTimers()).not.toThrow();expect(f.remove).toHaveBeenCalledTimes(1);warning.mockRestore();});
});

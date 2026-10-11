import {describe,it,expect} from 'vitest';
import {requestForSession} from '../src/lib/pilot/session';
describe('account refresh while signing in',()=>{
 it('ignores an old unauthorized response after a new login',async()=>{
  let token='expired';let reject!:(error:Error)=>void;
  const request=new Promise<never>((_,fail)=>{reject=fail;});
  const pending=requestForSession(()=>token,()=>request);
  token='new-session';reject(new Error('Unauthorized'));
  expect(await pending).toEqual({kind:'stale'});
 });
 it('does not replace the new account with a late old snapshot',async()=>{
  let token='old-account';let resolve!:(value:{name:string})=>void;
  const request=new Promise<{name:string}>(done=>{resolve=done;});
  const pending=requestForSession(()=>token,()=>request);
  token='new-account';resolve({name:'Old account'});
  expect(await pending).toEqual({kind:'stale'});
 });
 it('preserves errors for the session that is still active',async()=>{
  const error=new Error('Expired');
  expect(await requestForSession(()=> 'current',()=>Promise.reject(error))).toEqual({kind:'error',error});
 });
});

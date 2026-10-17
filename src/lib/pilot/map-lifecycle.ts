import type {MapInstance} from './mappls-client';

// Mappls initializes its interaction handlers asynchronously. Removing the map
// before load can throw inside handlers.destroy(); wait for load before teardown.
interface MapLifecycle {active:()=>boolean;dispose:()=>void}
export function mapLifecycle(map:MapInstance,onReady:()=>void):MapLifecycle{
 let initialized=false,disposed=false,removed=false;
 let fallback:ReturnType<typeof setTimeout>|undefined;
 function remove():void{
  if(removed)return;removed=true;clearTimeout(fallback);
  try{map.remove();}catch{console.warn('Mappls could not finish map cleanup.');}
 }
 function loaded():void{
  initialized=true;
  if(disposed)remove();else onReady();
 }
 map.addListener('load',loaded);
 if(map.loaded())loaded();
 return {
  active:()=>initialized&&!disposed,
  dispose():void{
   if(disposed)return;disposed=true;
   if(initialized)remove();else fallback=setTimeout(remove,20000);
  },
 };
}

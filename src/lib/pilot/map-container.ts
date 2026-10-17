import type {MapInstance,MapplsSDK} from './mappls-client';
// The Mappls constructor removes its last map again when container IDs match.
// React IDs can be reused across remounts; the SDK needs a unique ID per instance.
export function mountMap(sdk:MapplsSDK,parent:HTMLElement,options:Record<string,unknown>):MapInstance{
 const canvas=document.createElement('div');canvas.id=`pickr-map-${crypto.randomUUID()}`;canvas.style.height='100%';parent.replaceChildren(canvas);
 const map=new sdk.Map(canvas.id,options);const remove=map.remove.bind(map);let removed=false;
 // The provider retains references to previous maps and can remove one itself.
 // Its remove() is not idempotent: a second call destroys missing handlers.
 map.remove=()=>{if(removed)return;removed=true;remove();};
 return map;
}

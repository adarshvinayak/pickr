import type {MapInstance,MapplsSDK} from './mappls-client';
// The Mappls constructor removes its last map again when container IDs match.
// React IDs can be reused across remounts; the SDK needs a unique ID per instance.
export function mountMap(sdk:MapplsSDK,parent:HTMLElement,options:Record<string,unknown>):MapInstance{
 const canvas=document.createElement('div');canvas.id=`pickr-map-${crypto.randomUUID()}`;canvas.style.height='100%';parent.replaceChildren(canvas);return new sdk.Map(canvas.id,options);
}

/* eslint-disable @next/next/no-img-element -- Local WebP assets also bundled by Vite for Android. */
import {getMaterialById} from '@/config/materials';
import {getVehicleById} from '@/config/vehicles';
import {MaterialIcon} from '@/components/icons/MaterialIcon';
import {materials,vehicles,hero} from './catalogue-assets';
type Asset=string|{src:string};
const source=(asset:Asset)=>typeof asset==='string'?asset:asset.src;
export const heroImage=source(hero);
export function MaterialImage({id}:{id:string}){
 const photo=(materials as Record<string,Asset>)[id];
 if(!photo)return <MaterialIcon name={getMaterialById(id)?.iconKey||'mixed'} size={64}/>;
 return <img className="material-photo" src={source(photo)} alt="" width={240} height={240} loading="lazy" decoding="async"/>;
}
export function VehicleImage({id}:{id:string}){
 const photo=(vehicles as Record<string,Asset>)[id];
 if(!photo)return null;
 return <img className="vehicle-photo" src={source(photo)} alt={`${getVehicleById(id)?.displayName||'Truck'} — representative model`} width={420} height={300} loading="lazy" decoding="async"/>;
}

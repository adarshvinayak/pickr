import {getMaterialById} from '@/config/materials';
export function voiceQuantityChoices(materialId:string|null):string[]{
 const material=getMaterialById(materialId||'');
 if(!material)return ['Choose quantity'];
 const unit={nos:'numbers',bag:'bags',box:'boxes',bundle:'bundles',unit:'units',load:'loads',kg:'kilograms'}[material.nativeUnit];
 return [1,2,3].map(n=>`${material.minQuantity*n} ${material.minQuantity*n===1?unit.replace(/s$/,''):unit}`).concat('Choose quantity');
}

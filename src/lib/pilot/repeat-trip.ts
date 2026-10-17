import type {Trip} from './model';
export function repeatTripDetails(trip:Trip){
 const p=trip.payload;
 return {materialId:p.materialId,quantity:p.quantity,pickup:p.pickup,drop:p.drop,labourNeeded:p.labourNeeded,siteAccess:p.siteAccess,notes:p.notes||'',transitPassNo:'',scheduledFor:'',inputMode:'manual' as const};
}

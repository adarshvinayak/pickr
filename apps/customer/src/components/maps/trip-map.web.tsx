import {ServerMap} from './server-map';
import {getSnapshot} from '@/lib/api';
export const TRIP_MAP_AVAILABLE=true;
export function TripMap({pickup,delivery,truck,pickupLabel,deliveryLabel,truckLabel,line}:any){return <ServerMap config={{points:[...(pickup?[{lat:pickup.latitude,lng:pickup.longitude,label:pickupLabel,address:'',kind:'pickup'}]:[]),...(delivery?[{lat:delivery.latitude,lng:delivery.longitude,label:deliveryLabel,address:'',kind:'drop'}]:[]),...(truck?[{lat:truck.latitude,lng:truck.longitude,label:truckLabel,address:'',kind:'driver'}]:[])],zones:getSnapshot()?.zones||[],line}}/>;}

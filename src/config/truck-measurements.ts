// Input bounds for routing data; these are not legal road-access limits.
export const TRUCK_MEASUREMENTS = {
 height: {label:'Height',min:0.5,max:10,unit:'m'},
 width: {label:'Width',min:0.5,max:6,unit:'m'},
 length: {label:'Length',min:1,max:30,unit:'m'},
 weight: {label:'Max gross weight',min:0.2,max:100,unit:'t'},
 axle_load: {label:'Axle load',min:0.1,max:30,unit:'t'},
} as const;

// Mappls predictive routing returns encoded polyline6; API coordinates stay lng/lat.
export function decodePolyline(encoded:string):[number,number][] {
 let index=0,lat=0,lng=0;const coords:[number,number][]=[];
 function next(){let value=0,shift=0,byte:number;do{if(index>=encoded.length||shift>30)throw new Error('Invalid route geometry');byte=encoded.charCodeAt(index++)-63;if(byte<0||byte>63)throw new Error('Invalid route geometry');value|=(byte&31)<<shift;shift+=5;}while(byte>=32);return value&1?~(value>>1):value>>1;}
 while(index<encoded.length){lat+=next();lng+=next();if(Math.abs(lat/1e6)>90||Math.abs(lng/1e6)>180)throw new Error('Invalid route geometry');coords.push([lng/1e6,lat/1e6]);}return coords;
}
export function routeDeviationMeters(point:{lat:number;lng:number},polyline:string):number {
 try{const coordinates=JSON.parse(polyline) as [number,number][];if(coordinates.length<2)return Infinity;
 const scale=111320,cos=Math.cos(point.lat*Math.PI/180);let best=Infinity;
 for(let i=1;i<coordinates.length;i++){
  const [lng1,lat1]=coordinates[i-1],[lng2,lat2]=coordinates[i];const ax=(lng1-point.lng)*scale*cos,ay=(lat1-point.lat)*scale,bx=(lng2-point.lng)*scale*cos,by=(lat2-point.lat)*scale;
  const dx=bx-ax,dy=by-ay;const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(ax+t*dx,ay+t*dy));
 }return best;
 }catch{return Infinity;}
}

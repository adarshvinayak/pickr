import {networkInterfaces} from 'node:os';
try{process.loadEnvFile('.env.local');}catch{}
let value=process.env.PICKR_BACKEND_URL||process.env.PUBLIC_APP_URL||'';
if(value){const url=new URL(value);if(['localhost','127.0.0.1','0.0.0.0'].includes(url.hostname))value='';}
if(!value){
 const entries=Object.entries(networkInterfaces()).sort(([a],[b])=>Number(!a.startsWith('en'))-Number(!b.startsWith('en')));
 const address=entries.flatMap(([,items])=>items||[]).find(item=>item.family==='IPv4'&&!item.internal&&/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address));
 if(address)value=`http://${address.address}:${process.env.PORT||3000}`;
}
if(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Backend URL must be HTTP(S), without credentials.');value=url.origin;}
process.stdout.write(value);

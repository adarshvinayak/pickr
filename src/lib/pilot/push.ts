import { createSign } from 'node:crypto';
import { ApiError, check, database } from './server';
let cached:{token:string;expires:number}|null=null;
async function accessToken():Promise<{token:string;project:string}> {
 const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw new ApiError(503,'Optional Firebase service account is not configured. Native online driver alerts still use the foreground service.');
 const key=JSON.parse(raw) as {client_email:string;private_key:string;project_id:string};
 if(cached&&cached.expires>Date.now())return{token:cached.token,project:key.project_id};
 const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');const now=Math.floor(Date.now()/1000);
 const body=`${encode({alg:'RS256',typ:'JWT'})}.${encode({iss:key.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})}`;
 const signature=createSign('RSA-SHA256').update(body).sign(key.private_key).toString('base64url');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${body}.${signature}`}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new ApiError(502,'Firebase token exchange failed.');const data=await response.json();cached={token:data.access_token,expires:Date.now()+3000000};return{token:cached.token,project:key.project_id};
}
export async function flushPush():Promise<number> {
 const auth=await accessToken();const db=database();const queue=check(await db.from('pilot_push_outbox').select('*').is('sent_at',null).lt('attempts',5).gt('created_at',new Date(Date.now()-300000).toISOString()).order('created_at').limit(30));let sent=0;
 for(const item of queue){
 if(item.title==='New truck request') {const offer=check(await db.from('pilot_offers').select('response').eq('driver_id',item.owner_id).eq('booking_id',item.booking_id).maybeSingle());if(!offer||offer.response){check(await db.from('pilot_push_outbox').update({sent_at:new Date().toISOString()}).eq('id',item.id));continue;}}
 const tokens=check(await db.from('pilot_push_tokens').select('token').eq('owner_id',item.owner_id));let ok=true;
 for(const {token} of tokens){const response=await fetch(`https://fcm.googleapis.com/v1/projects/${auth.project}/messages:send`,{method:'POST',headers:{Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'},body:JSON.stringify({message:{token,data:{bookingId:item.booking_id||'',title:item.title,body:item.body},android:{priority:'high',ttl:'60s'}}}),signal:AbortSignal.timeout(10000)});if(!response.ok){ok=false;const body=await response.text();if(body.includes('UNREGISTERED'))check(await db.from('pilot_push_tokens').delete().eq('token',token));}}
 check(await db.from('pilot_push_outbox').update({attempts:item.attempts+1,sent_at:ok?new Date().toISOString():null}).eq('id',item.id));if(ok)sent++;
 }return sent;
}

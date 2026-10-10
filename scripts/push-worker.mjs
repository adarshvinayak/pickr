// Optional FCM outbox worker; use Node 24 with --env-file=.env.local.
const base=process.env.WORKER_BACKEND_URL||process.env.PUBLIC_APP_URL||'http://localhost:3000';
if(!process.env.WORKER_SECRET)throw new Error('Set WORKER_SECRET.');
let running=false;
async function tick(){if(running)return;running=true;try{const response=await fetch(`${base}/api/worker`,{method:'POST',headers:{Authorization:`Bearer ${process.env.WORKER_SECRET}`},signal:AbortSignal.timeout(55000)});if(!response.ok)console.error('Worker returned',response.status);else console.log('Worker completed',new Date().toISOString());}catch(e){console.error('Worker connection failed:',e.message);}finally{running=false;}}
await tick();setInterval(tick,15000);

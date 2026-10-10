import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{process.loadEnvFile('.env.local');}catch(error){if(error.code!=='ENOENT')throw error;}
const missing=['WORKER_SECRET','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','MAPPLS_REST_KEY','MAPPLS_WEB_KEY'].filter(key=>!process.env[key]||/your-|replace-with/.test(process.env[key]));
if(missing.length){console.error(`Run npm run pilot:setup first. Missing configuration: ${missing.join(', ')}`);process.exit(1);}
const port=process.env.PORT||'3000';const production=process.argv.includes('--production');
const children=[];let closing=false;
function close(code=0){if(closing)return;closing=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
// Match Mappls IPv4 egress allowlists; IPv6 remains available when IPv4 is absent.
const web=spawn(process.execPath,['--dns-result-order=ipv4first','node_modules/next/dist/bin/next',production?'start':'dev','--hostname','0.0.0.0','--port',port],{stdio:'inherit'});children.push(web);
const worker=spawn(process.execPath,['--dns-result-order=ipv4first','scripts/push-worker.mjs'],{stdio:'inherit',env:{...process.env,WORKER_BACKEND_URL:`http://127.0.0.1:${port}`}});children.push(worker);
for(const child of children){child.on('error',()=>close(1));child.on('exit',code=>close(code||0));}
process.on('SIGINT',()=>close());process.on('SIGTERM',()=>close());

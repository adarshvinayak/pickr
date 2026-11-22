import {execFileSync} from 'node:child_process';import {cpSync,mkdirSync,existsSync} from 'node:fs';
if(!existsSync('apps/customer/node_modules/expo'))execFileSync('npm',['ci','--ignore-scripts'],{cwd:'apps/customer',stdio:'inherit'});
execFileSync(process.execPath,['node_modules/expo/bin/cli','export','--platform','web'],{cwd:'apps/customer',stdio:'inherit'});mkdirSync('public/customer-app',{recursive:true});cpSync('apps/customer/dist','public/customer-app',{recursive:true});

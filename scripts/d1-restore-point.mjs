import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
// Keep a restore bookmark, never export member records into source or public storage.
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','time-travel','info','aurum-db','--json'],{encoding:'utf8',env:process.env,timeout:60000});
if(result.status!==0)throw Error('Cannot verify D1 Time Travel restore point; migrations stopped');
const output=JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
if(!output.bookmark && !output.current_bookmark)throw Error('D1 restore bookmark missing; migrations stopped');
mkdirSync('.test-state',{recursive:true});
writeFileSync('.test-state/d1-restore-point.json',JSON.stringify({createdAt:new Date().toISOString(),...output}),{mode:0o600});
console.log('D1 restore point verified before migrations; bookmark kept in private build workspace');
if(!/^[a-zA-Z0-9-]+$/.test(output.bookmark??output.current_bookmark))throw Error('Invalid restore bookmark');
const bookmark=output.bookmark??output.current_bookmark;
const audit=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','aurum-db','--remote','--command',`INSERT INTO audit_logs(id,actor_id,action,target,detail) VALUES('${crypto.randomUUID()}',NULL,'deployment.restore_point','fractional-points','${JSON.stringify({bookmark,createdAt:new Date().toISOString()})}')`],{encoding:'utf8',env:process.env,timeout:60000});
if(audit.status!==0)throw Error('Cannot persist D1 restore bookmark; migrations stopped');
console.log('Restore bookmark recorded in private database audit log');

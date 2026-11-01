import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {build} from 'esbuild';
mkdirSync('.test-state',{recursive:true});
await build({entryPoints:['server/payment-orders.ts','server/payment-monitor.ts','server/tron-rpc.ts','server/repository.ts'],outdir:'.test-state/payment-tests',bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const {paymentOrderAction}=await import('../.test-state/payment-tests/payment-orders.js');
const {scanPayments,approvePayment}=await import('../.test-state/payment-tests/payment-monitor.js');
const {TronRpc}=await import('../.test-state/payment-tests/tron-rpc.js');
const {Repository}=await import('../.test-state/payment-tests/repository.js');
function setup(){
 let queryCount=0;const sql=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('migrations/'+f,'utf8'));
 sql.exec("INSERT INTO users(id,username,email,password_hash) VALUES('u','test','test@example.test','h');INSERT INTO virtual_points(user_id,balance) VALUES('u',100);INSERT INTO game_assets(id,storage_key,media_type,size,original_name) VALUES('qr','qr','image/png',10,'test.png')");
 function statement(text,args=[]){return {bind(...values){return statement(text,values)},async first(){queryCount++;return sql.prepare(text).get(...args)??null},async all(){queryCount++;return {results:sql.prepare(text).all(...args)}},async run(){queryCount++;return {meta:sql.prepare(text).run(...args)}}};}
 const db={prepare:statement,async batch(items){sql.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
 const settings={enabled:true,autoApproval:true,address:'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',qrAssetId:'qr',qrConfirmed:true,revision:0,instructions:''};sql.prepare("UPDATE system_settings SET value=? WHERE key='payment_usdt_trc20'").run(JSON.stringify(settings));
 return {sql,db,repo:new Repository(db),settings,queries:()=>queryCount};
}
const user={id:'u'};
test('quote requests are idempotent, precise, private and limited to five active orders',async()=>{
 const {sql,db,repo,settings}=setup();const key=crypto.randomUUID();const first=await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:key},settings);
 assert.equal(first.order.credit_minor*10000,first.order.quote_micro);assert.ok(first.order.quote_micro>=10000000&&first.order.quote_micro<=10990000);
 const repeat=await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:key},settings);assert.equal(repeat.order.id,first.order.id);
 const another=await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings);assert.notEqual(first.order.quote_micro,another.order.quote_micro);
 await assert.rejects(paymentOrderAction(repo,{DB:db},{id:'other'},false,first.order.id,'PATCH',{action:'cancel'},settings),/不存在/);
 for(let i=0;i<3;i++)await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings);
 sql.exec('DELETE FROM rate_limits');await assert.rejects(paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings),/5笔/);sql.close();
});
test('public RPC rate limits fail closed and schedule a retry instead of crediting',async()=>{
 const {sql,db,repo,settings}=setup();await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings);
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}',{status:429})};
 try{await assert.rejects(scanPayments({DB:db}),/重试/);const state=sql.prepare('SELECT * FROM payment_monitor_state').get();assert.equal(state.last_error,'rpc_http_429');assert.ok(state.next_poll_ms>Date.now()+110000);assert.equal((await scanPayments({DB:db})).status,'busy');assert.equal(calls,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM point_records').get().n,0);}finally{globalThis.fetch=previous;sql.close()}
});
test('solidified RPC endpoint selection and optional key never use mutable HTTP input',async()=>{
 const paths=[];const rpc=new TronRpc({},async(url,options)=>{paths.push([url,options.headers]);return new Response(JSON.stringify({success:true,data:[],meta:{}}))});await rpc.history('T-test',123);assert.match(paths[0][0],/^https:\/\/api.trongrid.io\/v1\/accounts\//);assert.ok(paths[0][0].includes('only_confirmed=true'));assert.equal(paths[0][1]['TRON-PRO-API-KEY'],undefined);
 await assert.rejects(rpc.verified('invalid'),/格式/);
});
test('monitor approves one exact confirmed payment once and replays without another ledger entry',async()=>{
 const {sql,db,repo,settings}=setup();const {order}=await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings);
 sql.prepare('INSERT INTO chain_transfers VALUES(?,0,?,\'sender\',?,100,?,1)').run('a'.repeat(64),order.address_hex,String(order.quote_micro),order.created_ms+1);
 await approvePayment(repo,order.id,'auto');assert.equal((await approvePayment(repo,order.id,'auto')).replayed,true);assert.equal(sql.prepare('SELECT COUNT(*) n FROM point_records').get().n,1);const wallet=sql.prepare('SELECT * FROM virtual_points').get();assert.equal(wallet.balance*100+wallet.balance_fraction,10000+order.credit_minor);sql.close();
});
test('all 100 random cent suffixes are reserved even after cancellation, then allocation stops',async()=>{
 const {sql,db,repo,settings}=setup();const seen=new Set();
 for(let i=0;i<100;i++){
  sql.exec('DELETE FROM rate_limits');const {order}=await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings);seen.add(order.quote_micro);
  await paymentOrderAction(repo,{DB:db},user,false,order.id,'PATCH',{action:'cancel'},settings);
 }
 assert.equal(seen.size,100);sql.exec('DELETE FROM rate_limits');await assert.rejects(paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings),/用完/);sql.close();
});
test('late matching proof is routed for manual review without credit',async()=>{
 const {sql,db,repo,settings}=setup();const {order}=await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings);
 sql.prepare('INSERT INTO chain_transfers VALUES(?,0,?,\'sender\',?,100,?,1)').run('c'.repeat(64),order.address_hex,String(order.quote_micro),order.expires_ms+1);
 assert.equal((await approvePayment(repo,order.id,'auto')).manualReview,true);assert.equal(sql.prepare('SELECT status FROM recharge_orders').get().status,'manual_review');assert.equal(sql.prepare('SELECT COUNT(*) n FROM point_records').get().n,0);sql.close();
});
test('scheduled discovery verifies solidified receipt then settles atomically (RPC fixture)',async()=>{
 const {sql,db,repo,settings}=setup();const {order}=await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings);const hash='d'.repeat(64),calls=[];
 const previous=globalThis.fetch;globalThis.fetch=async(url)=>{calls.push(url);let data;
 if(url.includes('/v1/accounts/'))data={data:[{transaction_id:hash}],meta:{}};
 else if(url.endsWith('/gettransactionbyid'))data={txID:hash,ret:[{contractRet:'SUCCESS'}]};
 else if(url.endsWith('/gettransactioninfobyid'))data={id:hash,blockNumber:100,blockTimeStamp:order.created_ms+1,receipt:{result:'SUCCESS'},log:[{address:'a614f803b6fd780986a42c78ec9c7f77e6ded13c',topics:['ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef','0'.repeat(24)+'1'.repeat(40),'0'.repeat(24)+order.address_hex],data:BigInt(order.quote_micro).toString(16).padStart(64,'0')}]};
 else if(url.endsWith('/getnowblock'))data={block_header:{raw_data:{number:105}}};else throw Error('Unexpected RPC endpoint');
 return new Response(JSON.stringify(data));};
 try{assert.equal((await scanPayments({DB:db})).status,'ok');assert.equal(sql.prepare('SELECT status FROM recharge_orders').get().status,'approved');assert.equal(sql.prepare('SELECT COUNT(*) n FROM point_records').get().n,1);assert.equal(calls.length,4);assert.ok(calls.slice(1).every(url=>url.includes('/walletsolidity/')));}finally{globalThis.fetch=previous;sql.close()}
});

test('one hundred cached history entries use a bounded number of D1 queries',async()=>{
 const {sql,db,repo,settings,queries}=setup();await paymentOrderAction(repo,{DB:db},user,false,undefined,'POST',{amount:10,requestKey:crypto.randomUUID()},settings);
 const ids=Array.from({length:100},(_,i)=>i.toString(16).padStart(64,'0'));
 for(const id of ids)sql.prepare('INSERT INTO chain_checked_transactions VALUES(?,?)').run(id,Date.now());
 const previous=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({data:ids.map(transaction_id=>({transaction_id})),meta:{}}));
 try{const before=queries();assert.equal((await scanPayments({DB:db})).status,'ok');assert.ok(queries()-before<20,'Cached entries must not trigger a separate D1 query per transaction');assert.equal(sql.prepare('SELECT COUNT(*) n FROM point_records').get().n,0);}finally{globalThis.fetch=previous;sql.close()}
});

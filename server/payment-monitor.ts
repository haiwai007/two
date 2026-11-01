import { Repository } from "./repository";
import type { Env } from "../types/env";
import { RECHARGE_KEY, readRecharge } from "../lib/recharge";
import { TronRpc } from "./tron-rpc";
export async function storeVerified(repo:Repository,rpc:TronRpc,txId:string) {
 if(await repo.one("SELECT 1 FROM chain_checked_transactions WHERE tx_id=?",txId))return;
 const events=await rpc.verified(txId);
 await repo.batch([
  ...events.map(e=>repo.statement("INSERT OR IGNORE INTO chain_transfers(tx_id,log_index,recipient_hex,sender_hex,amount_micro,block_number,block_ms,verified) VALUES(?,?,?,?,?,?,?,1)",e.txId,e.logIndex,e.recipientHex,e.senderHex,e.amountMicro,e.blockNumber,e.blockTimestamp)),
  repo.statement("INSERT OR IGNORE INTO chain_checked_transactions(tx_id,checked_ms) VALUES(?,?)",txId,Date.now()),
 ]);
}
export async function approvePayment(repo:Repository,orderId:string,mode:"manual"|"auto",actorId:string|null=null,txId?:string) {
 const order=await repo.one<{status:string;address_hex:string;quote_micro:number;created_ms:number;expires_ms:number}>("SELECT * FROM recharge_orders WHERE id=?",orderId);
 if(!order)throw Object.assign(Error("充值订单不存在"),{status:404});
 if(order.status==="approved")return {replayed:true};
 const event=await repo.one<{tx_id:string;log_index:number;block_ms:number}>("SELECT e.* FROM chain_transfers e WHERE e.recipient_hex=? AND e.amount_micro=? AND e.block_ms>=? AND (? IS NULL OR e.tx_id=?) AND NOT EXISTS(SELECT 1 FROM recharge_orders r WHERE r.event_tx=e.tx_id AND r.event_index=e.log_index) ORDER BY e.block_ms LIMIT 1",order.address_hex,String(order.quote_micro),order.created_ms,txId??null,txId??null);
 if(!event)throw Object.assign(Error("尚无已固化且地址、金额一致的USDT付款，请稍后核实"),{status:409});
 if(mode==="auto"&&(event.block_ms>order.expires_ms||!["pending","expired"].includes(order.status))){
  if(["pending","expired","cancelled"].includes(order.status))await repo.run("UPDATE recharge_orders SET status='manual_review',review_note='付款迟到或订单已取消，请人工复核' WHERE id=? AND status IN ('pending','expired','cancelled')",orderId);
  return {manualReview:true};
 }
 const result=await repo.run("UPDATE recharge_orders SET status='approved',approval_mode=?,approved_by=?,reviewed_ms=?,event_tx=?,event_index=? WHERE id=? AND status IN ('pending','expired','manual_review','cancelled')",mode,actorId,Date.now(),event.tx_id,event.log_index,orderId);
 if(!result.meta.changes && (await repo.one<{status:string}>("SELECT status FROM recharge_orders WHERE id=?",orderId))?.status!=="approved")throw Object.assign(Error("订单状态已变化，请刷新"),{status:409});
 return {replayed:result.meta.changes===0};
}
export async function scanPayments(env:Env) {
 const repo=new Repository(env.DB), now=Date.now(), lease=crypto.randomUUID();
 const row=await repo.one<{value:string}>("SELECT value FROM system_settings WHERE key=?",RECHARGE_KEY),settings=readRecharge(row?.value);
 if(!settings.enabled||!settings.autoApproval)return {status:"disabled"};
 const claimed=await repo.run("UPDATE payment_monitor_state SET lease_id=?,lease_until=? WHERE name='trc20' AND lease_until<? AND next_poll_ms<=?",lease,now+120000,now,now);
 if(!claimed.meta.changes)return {status:"busy"};
 let checked=0;
 try {
  await repo.run("UPDATE recharge_orders SET status='expired' WHERE status='pending' AND expires_ms<?",now);
  const addresses=await repo.all<{address:string;since_ms:number}>("SELECT address,MIN(created_ms) since_ms FROM recharge_orders WHERE status IN ('pending','expired','manual_review','cancelled') AND created_ms>? GROUP BY address ORDER BY COALESCE((SELECT scanned_ms FROM payment_scan_cursors c WHERE c.address=recharge_orders.address),0),MIN(created_ms) LIMIT 5",now-86400000);
  const rpc=new TronRpc(env);let budget=6;
  for(const item of addresses){
   if(budget<=0||Date.now()-now>40000)break;
   await repo.run("INSERT INTO payment_scan_cursors(address,scanned_ms) VALUES(?,?) ON CONFLICT(address) DO UPDATE SET scanned_ms=excluded.scanned_ms",item.address,Date.now());
   const cursor=await repo.one<{fingerprint:string;since_ms:number}>("SELECT * FROM payment_scan_cursors WHERE address=?",item.address);
   const since=cursor?.fingerprint?cursor.since_ms:item.since_ms;
   const page=await rpc.history(item.address,since,cursor?.fingerprint??"");let complete=true;
   for(const id of page.ids){
    if(await repo.one("SELECT 1 FROM chain_checked_transactions WHERE tx_id=?",id))continue;
    if(budget<=0||Date.now()-now>40000){complete=false;break;}
    await storeVerified(repo,rpc,id);budget--;checked++;
   }
   if(complete)await repo.run("INSERT INTO payment_scan_cursors(address,fingerprint,since_ms) VALUES(?,?,?) ON CONFLICT(address) DO UPDATE SET fingerprint=excluded.fingerprint,since_ms=excluded.since_ms",item.address,page.fingerprint,since);
  }
  const matches=await repo.all<{id:string}>("SELECT DISTINCT r.id FROM recharge_orders r JOIN chain_transfers e ON e.recipient_hex=r.address_hex AND e.amount_micro=CAST(r.quote_micro AS TEXT) AND e.block_ms>=r.created_ms WHERE r.status IN ('pending','expired','cancelled') LIMIT 100");
  let refused=0;
  for(const match of matches){try{await approvePayment(repo,match.id,"auto");}catch{refused++;await repo.run("UPDATE recharge_orders SET status='manual_review',review_note='自动入账条件未满足，请人工复核' WHERE id=? AND status IN ('pending','expired','cancelled')",match.id);}}
  await repo.run("UPDATE payment_monitor_state SET last_scan_ms=?,last_error=?,scanned=scanned+?,next_poll_ms=?,lease_until=0 WHERE name='trc20' AND lease_id=?",Date.now(),refused?"settlement_review_required":null,checked,now+50000,lease);
  return {status:"ok",checked};
 }catch(error){
  // Provider pagination tokens can expire; restarting discovery is safe because proofs are cached.
  if((error as {code?:string}).code!=="rpc_http_429")await repo.run("UPDATE payment_scan_cursors SET fingerprint='' WHERE fingerprint<>''");
  const code=typeof(error as {code?:unknown}).code==="string"?(error as {code:string}).code:"rpc_or_scan_error";
  await repo.run("UPDATE payment_monitor_state SET last_scan_ms=?,last_error=?,next_poll_ms=?,lease_until=0 WHERE name='trc20' AND lease_id=?",Date.now(),code,now+120000,lease);
  throw Object.assign(Error("链上监测暂不可用，未核实的充值保持待确认，系统将重试"),{status:503});
 }
}

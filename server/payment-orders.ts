import type { Repository } from "./repository";
import type { User } from "./security";
import { rate } from "./security";
import type { Env } from "../types/env";
import { tronAddressHex, type RechargeSettings } from "../lib/recharge";
import { TronRpc } from "./tron-rpc";
import { approvePayment, scanPayments, storeVerified } from "./payment-monitor";
const fail=(message:string,status=400):never=>{throw Object.assign(Error(message),{status});};
export async function paymentOrderAction(repo:Repository,env:Env,user:User,admin:boolean,id:string|undefined,method:string,data:Record<string,unknown>,settings:RechargeSettings){
 if(admin&&id==="scan"&&method==="POST")return scanPayments(env);
 if(!admin&&!id&&method==="POST"){
  const key=String(data.requestKey??"");if(!/^[a-f0-9-]{36}$/.test(key))return fail("请求标识无效");
  const old=await repo.one("SELECT * FROM recharge_orders WHERE user_id=? AND request_key=?",user.id,key);if(old)return {order:old,replayed:true};
  await rate(repo,`recharge-create:${user.id}`,5,300);
  if(!settings.enabled||!settings.qrConfirmed||!settings.qrAssetId)return fail("充值通道未开放",409);
  const amount=Number(data.amount);if(!Number.isSafeInteger(amount)||amount<1||amount>1000000)return fail("请输入1至1,000,000的整数USDT，系统会生成精确两位小数应付金额");
  await repo.run("UPDATE recharge_orders SET status='expired' WHERE user_id=? AND status='pending' AND expires_ms<?",user.id,Date.now());
  const hex=await tronAddressHex(settings.address),used=await repo.all<{quote_micro:number}>("SELECT quote_micro FROM recharge_orders WHERE address=? AND base_usdt=?",settings.address,amount);
  const free=Array.from({length:100},(_,i)=>amount*1000000+i*10000).filter(value=>!used.some(row=>row.quote_micro===value));
  if(!free.length)return fail("该金额的匹配尾数已用完，请选择其他整数金额或联系管理员",409);
  const random=new Uint32Array(1);const now=Date.now(),orderId=crypto.randomUUID();
  while(free.length){
   const limit=Math.floor(4294967296/free.length)*free.length;do{crypto.getRandomValues(random);}while(random[0]>=limit);
   const index=random[0]%free.length,quote=free.splice(index,1)[0];
   const result=await repo.run("INSERT OR IGNORE INTO recharge_orders(id,user_id,request_key,base_usdt,quote_micro,credit_minor,address,address_hex,qr_asset_id,created_ms,expires_ms) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM recharge_orders WHERE user_id=? AND status IN ('pending','manual_review'))<5",orderId,user.id,key,amount,quote,quote/10000,settings.address,hex,settings.qrAssetId,now,now+1800000,user.id);
   if(result.meta.changes)return {order:await repo.one("SELECT * FROM recharge_orders WHERE id=?",orderId)};
   const duplicate=await repo.one("SELECT * FROM recharge_orders WHERE user_id=? AND request_key=?",user.id,key);if(duplicate)return {order:duplicate,replayed:true};
   const open=await repo.one<{total:number}>("SELECT COUNT(*) total FROM recharge_orders WHERE user_id=? AND status IN ('pending','manual_review')",user.id);if((open?.total??0)>=5)return fail("最多保留5笔待处理订单",409);
  }
  return fail("金额分配冲突，请重试",409);
 }
 if(method!=="PATCH"||!id)return fail("订单操作不存在",405);
 const order=await repo.one<{user_id:string;status:string;claimed_tx:string|null}>("SELECT * FROM recharge_orders WHERE id=?",id);
 if(!order||(!admin&&order.user_id!==user.id))return fail("订单不存在",404);
 if(data.action==="approve"&&admin){
  if(data.confirmed!==true)return fail("请确认已核实到账，系统还会校验固化交易回执");
  if(order.status==="approved")return {replayed:true};
  const tx=String(data.txHash??order.claimed_tx??"").trim().toLowerCase();if(!/^[a-f0-9]{64}$/.test(tx))return fail("请填写64位交易哈希");await rate(repo,`recharge-check:${user.id}`,8,60);
  await storeVerified(repo,new TronRpc(env),tx);await approvePayment(repo,id,"manual",user.id,tx);
 }else if(data.action==="reject"&&admin){
  const note=typeof data.note==="string"?data.note.trim():"";if(note.length<3||note.length>500)return fail("驳回说明为3至500字");
  const result=await repo.run("UPDATE recharge_orders SET status='rejected',review_note=?,approved_by=?,reviewed_ms=? WHERE id=? AND status IN ('pending','expired','cancelled','manual_review')",note,user.id,Date.now(),id);
  if(!result.meta.changes)return fail("订单状态已变化，请刷新",409);
  await repo.run("INSERT INTO audit_logs(id,actor_id,action,target,detail) VALUES(?,?,'recharge.rejected',?,?)",crypto.randomUUID(),user.id,id,JSON.stringify({note}));
 }else if(data.action==="cancel"&&!admin){
  const result=await repo.run("UPDATE recharge_orders SET status='cancelled' WHERE id=? AND user_id=? AND status IN ('pending','expired')",id,user.id);if(!result.meta.changes)return fail("订单不能取消，请刷新",409);
 }else if(data.action==="check"&&!admin){
  await rate(repo,`recharge-check:${user.id}`,6,60);const tx=String(data.txHash??"").trim().toLowerCase();if(!/^[a-f0-9]{64}$/.test(tx))return fail("请填写64位交易哈希");
  if(["approved","rejected"].includes(order.status))return fail("订单已处理",409);
  await repo.run("UPDATE recharge_orders SET claimed_tx=? WHERE id=?",tx,id);
  await storeVerified(repo,new TronRpc(env),tx);
  if(settings.autoApproval&&settings.enabled)await approvePayment(repo,id,"auto",null,tx);
  else await repo.run("UPDATE recharge_orders SET status='manual_review',review_note='用户已提交交易哈希，等待人工核实' WHERE id=? AND status IN ('pending','expired','cancelled')",id);
 }else return fail("无效订单操作",405);
 return {order:await repo.one("SELECT * FROM recharge_orders WHERE id=?",id)};
}

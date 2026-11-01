import { confirmedUsdtTransfers, USDT_TRC20_CONTRACT } from "../lib/tron-receipt";
import type { Env } from "../types/env";
export type ChainTransfer = ReturnType<typeof confirmedUsdtTransfers>[number];
export class TronRpc {
 private last=0;
 constructor(private env: Pick<Env,"TRONGRID_API_KEY">, private fetcher: typeof fetch = fetch) {}
 private async call(path:string, body?:unknown) {
  const wait=Math.max(0,600-(Date.now()-this.last));if(wait)await new Promise(r=>setTimeout(r,wait));this.last=Date.now();
  const headers:Record<string,string>={"Content-Type":"application/json","User-Agent":"Haiying-Payment-Monitor/1.0"};
  if(this.env.TRONGRID_API_KEY)headers["TRON-PRO-API-KEY"]=this.env.TRONGRID_API_KEY;
  const response=await this.fetcher("https://api.trongrid.io"+path,{method:body===undefined?"GET":"POST",headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Object.assign(Error(response.status===429?"TRONGrid请求受限，请稍后重试":"链上查询服务暂不可用"),{status:503,code:"rpc_http_"+response.status});
  const data=await response.json() as Record<string,any>;
  if(data.Error||data.error||data.success===false)throw Object.assign(Error("链上查询未成功，暂不入账"),{status:503,code:"rpc_rejected"});
  return data;
 }
 async history(address:string,since:number,fingerprint="") {
  const query=new URLSearchParams({only_confirmed:"true",contract_address:USDT_TRC20_CONTRACT,limit:"100",min_timestamp:String(since),order_by:"block_timestamp,asc"});
  if(fingerprint)query.set("fingerprint",fingerprint);
  const data=await this.call(`/v1/accounts/${encodeURIComponent(address)}/transactions/trc20?${query}`);
  if(!Array.isArray(data.data))throw Error("链上索引响应无效");
  return { ids:[...new Set(data.data.map((row:any)=>String(row.transaction_id)).filter((id:string)=>/^[a-f0-9]{64}$/.test(id)))] as string[],fingerprint:typeof data.meta?.fingerprint==="string"?data.meta.fingerprint:"" };
 }
 async verified(txId:string):Promise<ChainTransfer[]> {
  if(!/^[a-f0-9]{64}$/.test(txId))throw Object.assign(Error("交易哈希格式无效"),{status:400});
  const tx=await this.call("/walletsolidity/gettransactionbyid",{value:txId});
  const receipt=await this.call("/walletsolidity/gettransactioninfobyid",{value:txId});
  const head=await this.call("/walletsolidity/getnowblock",{});
  return confirmedUsdtTransfers(txId,tx,receipt,head.block_header?.raw_data?.number);
 }
}

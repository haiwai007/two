import test from "node:test";
import assert from "node:assert/strict";
import { confirmedUsdtTransfers, USDT_CONTRACT_HEX } from "../lib/tron-receipt.ts";
const txId="a".repeat(64), topic="ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const log={address:USDT_CONTRACT_HEX,topics:[topic,"0".repeat(24)+"1".repeat(40),"0".repeat(24)+"2".repeat(40)],data:(10370000n).toString(16).padStart(64,"0")};
const transaction={txID:txId,ret:[{contractRet:"SUCCESS"}]};
const receipt={id:txId,blockNumber:100,blockTimeStamp:1700000000000,receipt:{result:"SUCCESS"},log:[log]};
test("confirmed exact USDT transfer keeps micro-unit amount and global log index",()=>{
 const events=confirmedUsdtTransfers(txId,transaction,{...receipt,log:[{...log,address:"f".repeat(40)},log]},105);
 assert.equal(events.length,1);assert.equal(events[0].amountMicro,"10370000");assert.equal(events[0].logIndex,1);assert.equal(events[0].recipientHex,"2".repeat(40));
});
test("failed, wrong-identity and unconfirmed receipts are rejected",()=>{
 assert.throws(()=>confirmedUsdtTransfers(txId,transaction,{...receipt,id:"b".repeat(64)},105));
 assert.throws(()=>confirmedUsdtTransfers(txId,{...transaction,ret:[{contractRet:"REVERT"}]},receipt,105));
 assert.throws(()=>confirmedUsdtTransfers(txId,transaction,{...receipt,receipt:{result:"REVERT"}},105));
 assert.throws(()=>confirmedUsdtTransfers(txId,transaction,receipt,99));
});
test("fake tokens, malformed topics and zero amounts cannot become USDT payment proof",()=>{
 for(const changed of [{...log,address:"0".repeat(40)},{...log,topics:["f".repeat(64),...log.topics.slice(1)]},{...log,data:"f"},{...log,data:"0".repeat(64)},{...log,topics:[topic,"x".repeat(64),log.topics[2]]}]) assert.equal(confirmedUsdtTransfers(txId,transaction,{...receipt,log:[changed]},105).length,0);
});

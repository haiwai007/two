import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { validTronAddress, defaultRecharge, readRecharge, RECHARGE_KEY } from "../lib/recharge.ts";
// Public burn address used only as a checksum fixture; never seeded into production settings.
const address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb";
test("TRC20 address validation checks Base58Check rather than only the T prefix",async()=>{
 assert.equal(await validTronAddress(address),true);
 for(const value of ["",address.slice(0,-1)+"c","0x123456789", "T".repeat(34),"T0"+address.slice(2)])assert.equal(await validTronAddress(value),false);
});
test("settings parser rejects truthy strings and does not expose extra fields",()=>{
 const value=readRecharge(JSON.stringify({enabled:"true",qrConfirmed:"yes",revision:-1,privateKey:"must-not-escape",address:123}));
 assert.equal(value.enabled,false);assert.equal(value.qrConfirmed,false);assert.equal(value.revision,0);assert.equal(value.address,"");assert.ok(!("privateKey" in value));
 assert.deepEqual(readRecharge("invalid json"),defaultRecharge);
});
test("recharge starts disabled and migrations never choose a receiving address",()=>{
 const db=new DatabaseSync(":memory:");
 for(const file of readdirSync("migrations").filter(f=>f.endsWith(".sql")).sort())db.exec(readFileSync("migrations/"+file,"utf8"));
 const value=db.prepare("SELECT value FROM system_settings WHERE key=?").get(RECHARGE_KEY)!.value as string;
 assert.equal(readRecharge(value).enabled,false);assert.equal(readRecharge(value).autoApproval,false);assert.equal(readRecharge(value).address,"");db.close();
});

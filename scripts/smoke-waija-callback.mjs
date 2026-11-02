import assert from "node:assert/strict";
const base="https://h6688.win/api/waija/callback";
const headers={"User-Agent":"AURUM-Deployment-Check/0.2 (+https://github.com/haiwai007/two)"};
for(const action of [null,"balance","debit","credit"]){
 const url=new URL(base);
 if(action){url.search=new URLSearchParams({action,username:"waija-onboarding-check",amount:"100",call_id:crypto.randomUUID(),timestamp:String(Math.floor(Date.now()/1000)),key:"invalid"}).toString();}
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,200);assert.match(response.headers.get("content-type")??"",/application\/json/);assert.match(response.headers.get("cache-control")??"",/no-store/);
 const body=await response.json();assert.equal(body.error,2);assert.equal(body.balance,0);
}
const head=await fetch(base,{method:"HEAD",headers,signal:AbortSignal.timeout(20000)});assert.equal(head.status,200);assert.equal(await head.text(),"");
console.log("PASS Waija HTTPS endpoint, HEAD and unsigned balance/debit/credit rejection; no authenticated wallet transactions sent");

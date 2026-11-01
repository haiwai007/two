// OpenNext's generated Worker remains responsible for HTTP and exported durable objects.
import handler from "../.open-next/worker.js";
import { scanPayments } from "../server/payment-monitor";
import type { Env } from "../types/env";
export * from "../.open-next/worker.js";
export default {
 fetch: handler.fetch,
 async scheduled(_event:ScheduledEvent,env:Env,context:ExecutionContext){
  context.waitUntil(scanPayments(env).catch(()=>{console.error("TRC20 monitor deferred; see payment monitor status");}));
 },
};

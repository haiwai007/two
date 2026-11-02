import { callbackNotReady, callbackHead } from "../../../../server/waija-callback";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return callbackNotReady(request); }
export const POST = GET;
export const OPTIONS = GET;
export function HEAD() { return callbackHead(); }

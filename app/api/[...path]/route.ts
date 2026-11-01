import { handle } from "../../../server/api";
export const dynamic = "force-dynamic";
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
export async function HEAD(request: Request) {
  const response = await handle(new Request(request, { method: "GET" }));
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}

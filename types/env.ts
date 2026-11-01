export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  REQUIRE_TURNSTILE?: string;
  TRONGRID_API_KEY?: string;
}

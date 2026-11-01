export async function cleanExpired(db: D1Database) {
  const now = Date.now();
  const result = await db.batch([
    db
      .prepare(
        "DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires_at<=? LIMIT 5000)",
      )
      .bind(now),
    db
      .prepare(
        "DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE reset_at<=? LIMIT 5000)",
      )
      .bind(Math.floor(now / 1000)),
  ]);
  return {
    sessions: result[0].meta.changes,
    rateLimits: result[1].meta.changes,
  };
}

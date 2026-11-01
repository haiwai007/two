import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { bootstrapFirstOwner } from "../scripts/bootstrap-first-owner.mjs";
const userId = "aaaaaaaa-1111-2222-3333-444444444444", otherId = "bbbbbbbb-1111-2222-3333-444444444444";
const target = { userId, expiresAt: "2099-01-01T00:00:00Z" };
function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("migrations/0001_initial.sql", "utf8"));
  db.prepare("INSERT INTO users(id,username,email,password_hash) VALUES(?,?,?,?)").run(userId, "owner-test", "owner@example.test", "test-hash");
  db.prepare("INSERT INTO users(id,username,email,password_hash) VALUES(?,?,?,?)").run(otherId, "other-test", "other@example.test", "test-hash");
  const query = async (sql, params = []) => {
    const stmt = db.prepare(sql);
    if (/^\s*SELECT/i.test(sql)) return { rows: stmt.all(...params), changes: 0 };
    return { rows: [], changes: Number(stmt.run(...params).changes) };
  };
  return { db, query };
}
test("explicit target becomes the only owner and receives an audit entry", async () => {
  const { db, query } = fixture();
  const result = await bootstrapFirstOwner({ ...target, query });
  assert.equal(result.firstOwner, "created");
  assert.equal(db.prepare("SELECT user_id FROM admin_users WHERE role='owner'").get().user_id, userId);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='admin.bootstrap'").get().n, 1);
  db.close();
});
test("retries are idempotent and repair a missing audit without duplicating roles", async () => {
  const { db, query } = fixture();
  await bootstrapFirstOwner({ ...target, query });
  db.exec("DELETE FROM audit_logs");
  assert.equal((await bootstrapFirstOwner({ ...target, query })).firstOwner, "confirmed");
  await bootstrapFirstOwner({ ...target, query });
  assert.equal(db.prepare("SELECT COUNT(*) n FROM admin_users").get().n, 1);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM audit_logs").get().n, 1);
  db.close();
});
test("an existing different owner is preserved and blocks bootstrap", async () => {
  const { db, query } = fixture();
  db.prepare("INSERT INTO admin_users VALUES(?,'owner')").run(otherId);
  await assert.rejects(bootstrapFirstOwner({ ...target, query }), /different owner/);
  assert.equal(db.prepare("SELECT user_id FROM admin_users").get().user_id, otherId);
  db.close();
});
test("blocked, missing and existing non-owner targets cannot be promoted", async () => {
  for (const sql of ["UPDATE users SET status='blocked' WHERE id=?", "DELETE FROM users WHERE id=?", "INSERT INTO admin_users VALUES(?,'editor')"]) {
    const { db, query } = fixture();
    db.prepare(sql).run(userId);
    await assert.rejects(bootstrapFirstOwner({ ...target, query }));
    assert.equal(db.prepare("SELECT COUNT(*) n FROM admin_users WHERE role='owner'").get().n, 0);
    db.close();
  }
});
test("expired or disabled instructions do not query or modify the database", async () => {
  for (const config of [{ ...target, userId: undefined }, { ...target, expiresAt: "2000-01-01T00:00:00Z" }]) {
    const result = await bootstrapFirstOwner({ ...config, query: async () => assert.fail("No DB access allowed") });
    assert.ok(["not-configured-no-changes", "expired-no-changes"].includes(result.firstOwner));
  }
});
test("an owner appearing between reads and insert is not overwritten", async () => {
  const { db, query } = fixture();
  let insertedOther = false;
  const racingQuery = async (sql, params) => {
    if (sql.startsWith("INSERT INTO admin_users") && !insertedOther) {
      db.prepare("INSERT INTO admin_users VALUES(?,'owner')").run(otherId); insertedOther = true;
    }
    return query(sql, params);
  };
  await assert.rejects(bootstrapFirstOwner({ ...target, query: racingQuery }), /not applied/);
  assert.equal(db.prepare("SELECT user_id FROM admin_users").get().user_id, otherId);
  db.close();
});

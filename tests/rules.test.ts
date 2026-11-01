import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculate,
  golden,
  dragon,
  phoenix,
  secureInt,
} from "../game-engine/rules.ts";
test("golden: five independent lines and wild substitution", () => {
  const zero = golden(10, () => 0);
  assert.equal(zero.reward, 100);
  assert.equal(zero.wins.length, 5);
  assert.equal(golden(10, () => 7).reward, 1000);
  const seq = [0, 1, 2, 7, 3, 4, 0, 5, 6];
  let i = 0;
  const wild = golden(10, () => seq[i++]);
  assert.ok(wild.wins.some((w) => JSON.stringify(w) === "[0,3,6]"));
});
test("dragon: ways counted from left, scatter double", () => {
  assert.equal(dragon(10, () => 0).reward, 2430);
  assert.equal(dragon(10, () => 9).reward, 0);
  assert.equal(dragon(10, () => 9).multiplier, 2);
  let n = 0;
  const grid = [0, 1, 2, 0, 3, 4, 0, 5, 6, 9, 9, 9, 7, 7, 7];
  const r = dragon(10, () => grid[n++]);
  assert.equal(r.reward, 6);
  assert.equal(r.multiplier, 2);
});
test("phoenix: cluster cascade has explicit five-round bound", () => {
  const r = phoenix(10, () => 0);
  assert.equal(r.reward, 3900);
  assert.equal(r.cascades?.length, 5);
  assert.equal(r.grid.length, 6);
  assert.equal(r.grid[0].length, 5);
});
test("invalid games and stakes cannot play", () => {
  for (const stake of [0, -10, 1, NaN, Infinity, 10.1, Number.MAX_SAFE_INTEGER])
    assert.throws(() => calculate("golden-god", stake));
  assert.throws(() => calculate("planned", 10));
});
test("cryptographic range and distribution invariants", () => {
  for (const max of [1, 7, 10, 97])
    for (let i = 0; i < 500; i++) {
      const n = secureInt(max);
      assert.ok(n >= 0 && n < max && Number.isInteger(n));
    }
  assert.throws(() => secureInt(0));
});
test("1000 deterministic mixed rounds per original game preserve result contracts", () => {
  let state = 87654321;
  const rng = (max: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % max;
  };
  for (const id of ["golden-god", "dragon-world", "phoenix-legend"])
    for (let i = 0; i < 1000; i++) {
      const r = calculate(id, 10, rng);
      assert.ok(Number.isSafeInteger(r.reward) && r.reward >= 0);
      assert.ok(r.cascades === undefined || r.cascades.length <= 5);
    }
});
import { canonicalLocation } from "../lib/canonical.ts";
test("www canonical redirect preserves path and query", () => {
  assert.equal(
    canonicalLocation("http://www.h6688.win:8787/games?q=dragon"),
    "https://h6688.win/games?q=dragon",
  );
  assert.equal(
    canonicalLocation("http://internal:3000/game/golden-god", "www.h6688.win"),
    "https://h6688.win/game/golden-god",
  );
});
test("canonical root and unrelated hosts are left unchanged", () => {
  assert.equal(canonicalLocation("https://h6688.win/games"), null);
  assert.equal(canonicalLocation("http://localhost:3000/games"), null);
});

import { formatTimestamp } from "../lib/time.ts";
test("member timestamps use Shanghai timezone including midnight rollover", () => {
  assert.equal(formatTimestamp("2026-10-31 18:30:00"), "2026/11/01 02:30:00");
  assert.equal(formatTimestamp("2026-11-01T00:00:00Z"), "2026/11/01 08:00:00");
});

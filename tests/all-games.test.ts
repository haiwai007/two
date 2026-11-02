import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { FREE_SPINS, tuning } from "../game-engine/features.ts";
import {
  baseRound,
  calculate,
  implementedGameIds,
  isImplementedGame,
} from "../game-engine/rules.ts";
const definitions = JSON.parse(
  fs.readFileSync(
    new URL("../lib/game-definitions.json", import.meta.url),
    "utf8",
  ),
) as { id: string; columns: number; rows: number; symbols: string[] }[];
function seeded(seed: number) {
  return (max: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  };
}
for (const [index, def] of definitions.entries())
  test(
    def.id + ": 1000 round contracts, deterministic replay and stake scaling",
    () => {
      const rng = seeded(123456 + index);
      for (let n = 0; n < 1000; n++) {
        const result = calculate(def.id, 10, rng);
        assert.equal(result.grid.length, def.columns);
        assert.equal(result.gameVersion, "0.2.0");
        assert.ok(Number.isSafeInteger(result.reward) && result.reward >= 0);
        assert.ok((result.steps?.length ?? 0) <= 12);
        for (const n of result.scatters ?? [])
          assert.equal(result.grid[Math.floor(n / def.rows)][n % def.rows], def.symbols.length);
        for (const frame of [result, ...(result.steps ?? [])]) {
          assert.equal(frame.grid.length, def.columns);
          for (const col of frame.grid) {
            assert.equal(col.length, def.rows);
            col.forEach((s) =>
              assert.ok(
                Number.isInteger(s) && s >= 0 && s <= def.symbols.length,
              ),
            );
          }
          for (const win of frame.wins)
            for (const cell of win)
              assert.ok(
                Number.isInteger(cell) &&
                  cell >= 0 &&
                  cell < def.columns * def.rows,
              );
        }
      }
      const a = calculate(def.id, 10, seeded(245)),
        b = calculate(def.id, 10, seeded(245));
      assert.deepEqual(a, b);
      const larger = calculate(def.id, 100, seeded(245));
      assert.deepEqual(a.grid, larger.grid);
      assert.ok(
        Math.abs(larger.reward - a.reward * 10) < 300,
        "only integer rounding may change scaling",
      );
    },
  );
test("all 30 programs are unique source modules and prototype keys are rejected", () => {
  assert.equal(implementedGameIds.length, 30);
  for (const id of ["toString", "__proto__", "constructor", "missing"]) {
    assert.equal(isImplementedGame(id), false);
    assert.throws(() => calculate(id, 10));
  }
  const hashes = definitions.map((d) =>
    fs.readFileSync(
      new URL("../games/" + d.id + "/rules/index.ts", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(new Set(hashes).size, 30);
});
test("enclosed free reveals are bounded and do not retrigger", () => {
  const egypt = baseRound("egypt-pharaoh", 10, (max) => max - 1);
  assert.equal(egypt.steps?.length, 3);
  const miner = baseRound("gold-miner", 10, () => 0);
  assert.equal(miner.steps?.length, 2);
  assert.equal(miner.reward, 450);
});
test("special mechanic fixtures have independent payout behavior", () => {
  assert.equal(baseRound("gem-kingdom", 10, () => 0).reward, 520);
  assert.equal(baseRound("eastern-myth", 10, () => 0).reward, 320);
  assert.equal(baseRound("star-journey", 10, (max) => max - 1).reward, 950);
  assert.equal(baseRound("mysterious-vault", 10, () => 0).reward, 60);
});
test("scatter free spins are bounded, escalate and never retrigger", () => {
  for (const def of definitions) {
    assert.equal(tuning[def.id][1], def.symbols.length);
    // rng(10000) => 0 places a scatter on every non-winning cell.
    const result = calculate(def.id, 10, (max) => (max === 10000 ? 0 : max - 1));
    const spins = result.freeSpins?.spins ?? 0;
    if ((result.scatters?.length ?? 0) >= 3) {
      assert.equal(spins, FREE_SPINS[Math.min(result.scatters!.length, 5)]);
      const free = result.steps!.slice(-spins);
      free.forEach((step, i) => assert.match(step.label, new RegExp(`×${i + 1}$`)));
      assert.equal(result.freeSpins!.reward, free.reduce((a, s) => a + s.reward, 0));
    }
    assert.ok((result.steps?.length ?? 0) <= 12);
  }
});

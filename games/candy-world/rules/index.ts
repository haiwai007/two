import {
  secureInt,
  type RandomInt,
  type Round,
} from "../../../game-engine/random.ts";
import {
  draw,
  clone,
  cells,
  line,
  runs,
  groups,
  round,
  type Grid,
} from "../../../game-engine/primitives.ts";
// Horizontal candy runs melt toward the center and refill from the sides, up to three waves.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  let grid = draw(6, 5, 6, rng);
  const initial = clone(grid),
    steps: NonNullable<Round["steps"]> = [];
  let total = 0;
  const initialWins: number[][] = [];
  for (let wave = 1; wave <= 3; wave++) {
    const wins: number[][] = [],
      remove = new Set<number>();
    let reward = 0;
    for (let row = 0; row < 5; row++)
      for (const run of runs(grid.map((col) => col[row])))
        if (run.length >= 3) {
          const indices = Array.from(
            { length: run.length },
            (_, i) => (run.start + i) * 5 + row,
          );
          wins.push(indices);
          indices.forEach((n) => remove.add(n));
          reward += stake * (run.length - 2) * (run.symbol + 1) * wave;
        }
    if (!wins.length) break;
    if (wave === 1) initialWins.push(...wins);
    steps.push({
      grid: clone(grid),
      wins,
      reward,
      label: `糖果横消 第${wave}波`,
    });
    total += reward;
    for (let row = 0; row < 5; row++) {
      const keep = grid
          .map((col) => col[row])
          .filter((_, c) => !remove.has(c * 5 + row)),
        missing = 6 - keep.length,
        left = Math.floor(missing / 2);
      const next = [
        ...Array.from({ length: left }, () => rng(6)),
        ...keep,
        ...Array.from({ length: missing - left }, () => rng(6)),
      ];
      for (let c = 0; c < 6; c++) grid[c][row] = next[c];
    }
  }
  return {
    ...round(
      initial,
      total,
      initialWins,
      `糖果横向融化 · ${steps.length}波连消`,
    ),
    steps,
  };
}

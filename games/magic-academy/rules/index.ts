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
// Four rune columns pay top-to-bottom runs; their longest spell becomes the final multiplier.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(4, 6, 6, rng),
    wins: number[][] = [];
  let reward = 0,
    longest = 0;
  for (let c = 0; c < 4; c++)
    for (const run of runs(grid[c]))
      if (run.length >= 3) {
        reward += stake * (run.symbol + 1) * (run.length - 2);
        longest = Math.max(longest, run.length);
        wins.push(
          Array.from({ length: run.length }, (_, i) => c * 6 + run.start + i),
        );
      }
  const multiplier = longest >= 5 ? 3 : longest === 4 ? 2 : 1;
  return round(
    grid,
    reward * multiplier,
    wins,
    `纵向咒语 · 最长${longest}枚 · ${multiplier}倍学院共鸣`,
    multiplier,
  );
}

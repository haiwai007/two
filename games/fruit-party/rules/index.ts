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
// Symbol counts across the whole board pay in tiers, with distinct fruit variety bonus.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(6, 4, 8, rng),
    wins: number[][] = [];
  let reward = 0;
  for (let symbol = 0; symbol < 8; symbol++) {
    const matched = cells(grid, symbol);
    if (matched.length >= 5) {
      reward += stake * (matched.length - 4) * (symbol + 1);
      wins.push(matched);
    }
  }
  const variety = new Set(grid.flat()).size;
  if (variety === 8) {
    reward += stake * 2;
  }
  return round(
    grid,
    reward,
    wins,
    `水果齐聚 · 全盘五枚计奖${variety === 8 ? " · 八果齐全加奖" : ""}`,
  );
}

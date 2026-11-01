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
// Tree clusters spread diagonally; groups containing a corner gain an extra growth factor.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 5, 7, rng),
    wins = groups(grid, true).filter((g) => g.length >= 6);
  let reward = 0;
  for (const group of wins) {
    const symbol = grid[Math.floor(group[0] / 5)][group[0] % 5],
      corner = group.some((n) => [0, 4, 20, 24].includes(n));
    reward += stake * (group.length - 5) * (symbol + 1) * (corner ? 2 : 1);
  }
  return round(
    grid,
    reward,
    wins,
    "森林蔓延 · 八方向六枚成群 · 触角群奖励翻倍",
  );
}

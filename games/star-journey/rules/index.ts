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
// Seven ordered constellation points score runs of stars anywhere along a winding constellation.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(7, 3, 7, rng),
    path = [1, 0, 2, 1, 0, 2, 1],
    values = path.map((r, c) => (grid[c][r] >= 5 ? 1 : 0)),
    wins: number[][] = [];
  let reward = 0;
  for (const run of runs(values))
    if (run.symbol === 1 && run.length >= 3) {
      const positions = Array.from(
        { length: run.length },
        (_, i) => (run.start + i) * 3 + path[run.start + i],
      );
      wins.push(positions);
      reward += stake * (run.length - 2) ** 2 * 3;
    }
  if (values.every(Boolean)) reward += stake * 20;
  return round(grid, reward, wins, "七点星图 · 曲线路径中连续三颗星光起奖");
}

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
// Four dragon seals on the outer corners awaken a central expanding Wild.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const initial = draw(4, 4, 8, rng),
    grid = clone(initial),
    corners = [0, 3, 12, 15];
  const seals = corners.filter(
    (n) => grid[Math.floor(n / 4)][n % 4] === 7,
  ).length;
  if (seals >= 2)
    for (const c of [1, 2]) for (const r of [1, 2]) grid[c][r] = 7;
  let reward = 0;
  const wins: number[][] = [];
  for (const path of [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [2, 2, 2, 2],
    [3, 3, 3, 3],
    [0, 1, 2, 3],
    [3, 2, 1, 0],
  ]) {
    const hit = line(grid, path, 7);
    if (hit) {
      reward += stake * (hit.symbol + 2);
      wins.push(hit.indices);
    }
  }
  const result = round(
    initial,
    reward,
    wins,
    seals >= 2 ? "龙印唤醒 · 中央四格扩展Wild" : "四方龙印 · 六条完整连线",
  );
  if (seals >= 2)
    result.steps = [{ grid, wins, reward, label: "中央龙印展开" }];
  return result;
}

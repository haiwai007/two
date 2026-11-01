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
// A compass selects a connected orthogonal treasure trail, with consecutive coin chests.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(4, 5, 8, rng);
  let x = 0,
    y = rng(5),
    reward = 0;
  const trail = [y];
  for (let c = 1; c < 4; c++) {
    y = (y + [0, 1, -1][rng(3)] + 5) % 5;
    x = c;
    trail.push(x * 5 + y);
  }
  const coins = trail.filter((n) => grid[Math.floor(n / 5)][n % 5] <= 2);
  if (coins.length >= 3) reward = stake * coins.length * 2;
  const keys = cells(grid, 7);
  if (keys.length >= 3) reward += stake * (rng(6) + 1) * keys.length;
  return round(
    grid,
    reward,
    [
      ...(coins.length >= 3 ? [coins] : []),
      ...(keys.length >= 3 ? [keys] : []),
    ],
    `罗盘航线 · ${coins.length}处宝藏${keys.length >= 3 ? " · 钥匙开启宝箱" : ""}`,
  );
}

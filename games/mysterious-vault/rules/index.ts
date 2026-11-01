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
// Each three-cell tumbler unlocks when outer digits modulo six equal the center digit.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(3, 3, 6, rng),
    wins: number[][] = [];
  let reward = 0;
  for (let c = 0; c < 3; c++)
    if ((grid[c][0] + grid[c][2]) % 6 === grid[c][1]) {
      reward += stake * (grid[c][1] + 1);
      wins.push([c * 3, c * 3 + 1, c * 3 + 2]);
    }
  if (wins.length === 3) reward += stake * (rng(12) + 3);
  return round(
    grid,
    reward,
    wins,
    `密码锁 · ${wins.length}/3锁芯开启${wins.length === 3 ? " · 三锁宝库奖励" : ""}`,
  );
}

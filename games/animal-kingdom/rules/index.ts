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
// A species needs an adjacent vertical pair in three consecutive habitats to migrate.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 4, 6, rng),
    wins: number[][] = [];
  let reward = 0;
  for (let species = 0; species < 6; species++) {
    let streak: number[][] = [];
    const flush = () => {
      if (streak.length >= 3) {
        reward += stake * (species + 1) * (streak.length - 2) * 2;
        wins.push(streak.flat());
      }
      streak = [];
    };
    for (let c = 0; c < 5; c++) {
      const pair = grid[c].findIndex(
        (s, r) => r < 3 && s === species && grid[c][r + 1] === species,
      );
      if (pair >= 0) streak.push([c * 4 + pair, c * 4 + pair + 1]);
      else flush();
    }
    flush();
  }
  return round(grid, reward, wins, "族群迁徙 · 三个连续栖地的纵向同类对");
}

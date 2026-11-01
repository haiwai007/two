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
// A random season activates one checkerboard parity; neighboring water doubles harvested flower groups.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 5, 7, rng),
    season = rng(2),
    wins: number[][] = [];
  let reward = 0;
  for (let flower = 0; flower < 6; flower++) {
    const match = cells(grid, flower).filter(
      (n) => (Math.floor(n / 5) + (n % 5)) % 2 === season,
    );
    if (match.length < 4) continue;
    const watered = match.some((n) => {
      const c = Math.floor(n / 5),
        row = n % 5;
      return [
        [c - 1, row],
        [c + 1, row],
        [c, row - 1],
        [c, row + 1],
      ].some(
        ([x, y]) => x >= 0 && x < 5 && y >= 0 && y < 5 && grid[x][y] === 6,
      );
    });
    reward += stake * (flower + 1) * (match.length - 3) * (watered ? 2 : 1);
    wins.push(match);
  }
  return round(
    grid,
    reward,
    wins,
    `${season === 0 ? "春日" : "秋日"}棋盘花圃 · 四花收集 · 邻水双倍`,
  );
}

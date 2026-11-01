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
// Every monochromatic 2x2 square is evaluated; overlapping squares form a royal network bonus.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 4, 6, rng),
    wins: number[][] = [],
    all = new Set<number>();
  let reward = 0;
  for (let c = 0; c < 4; c++)
    for (let row = 0; row < 3; row++) {
      const symbol = grid[c][row];
      if (
        grid[c + 1][row] === symbol &&
        grid[c][row + 1] === symbol &&
        grid[c + 1][row + 1] === symbol
      ) {
        const square = [
          c * 4 + row,
          c * 4 + row + 1,
          (c + 1) * 4 + row,
          (c + 1) * 4 + row + 1,
        ];
        wins.push(square);
        square.forEach((n) => all.add(n));
        reward += stake * (symbol + 2);
      }
    }
  const overlap = wins.length * 4 - all.size;
  reward += stake * overlap;
  return round(
    grid,
    reward,
    wins,
    `宝石方阵 · ${wins.length}个四方阵 · ${overlap}格王国交汇`,
  );
}

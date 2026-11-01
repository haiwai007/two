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
// Matching yin-yang mirror pairs create seals; a fully symmetric board opens the celestial gate.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(4, 4, 6, rng),
    wins: number[][] = [];
  let reward = 0,
    pairs = 0;
  for (let c = 0; c < 2; c++)
    for (let row = 0; row < 4; row++)
      if (grid[c][row] === grid[3 - c][3 - row]) {
        pairs++;
        reward += stake * (grid[c][row] + 1);
        wins.push([c * 4 + row, (3 - c) * 4 + 3 - row]);
      }
  const multiplier = pairs === 8 ? 4 : pairs >= 6 ? 2 : 1;
  return round(
    grid,
    reward * multiplier,
    wins,
    `太极中心对称 · ${pairs}/8印 · ${multiplier}倍`,
    multiplier,
  );
}

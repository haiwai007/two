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
// Three mirrored double-reel gates require all three paired rows to match, with Wild keys.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(6, 3, 8, rng),
    wins: number[][] = [];
  let reward = 0;
  for (let gate = 0; gate < 3; gate++) {
    const left = gate,
      right = 5 - gate,
      positions: number[] = [];
    for (let row = 0; row < 3; row++)
      if (
        grid[left][row] === grid[right][row] ||
        grid[left][row] === 7 ||
        grid[right][row] === 7
      )
        positions.push(left * 3 + row, right * 3 + row);
    if (positions.length === 6) {
      reward += stake * (gate + 1) * 4;
      wins.push(positions);
    }
  }
  const multiplier = wins.length === 3 ? 3 : 1;
  reward *= multiplier;
  if (wins.length >= 2) reward += stake * (rng(9) + 1);
  return round(
    grid,
    reward,
    wins,
    `镜像财富门 · ${wins.length}/3扇开启${wins.length === 3 ? " · 全门三倍" : ""}`,
    multiplier,
  );
}

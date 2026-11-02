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
// Concentric Chebyshev rings around the center pay independent light-collection tiers.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 5, 7, rng),
    symbol = grid[2][2],
    wins: number[][] = [];
  let reward = 0,
    full = 0;
  for (const radius of [1, 2]) {
    const ring: number[] = [];
    for (let c = 0; c < 5; c++)
      for (let row = 0; row < 5; row++)
        if (Math.max(Math.abs(c - 2), Math.abs(row - 2)) === radius)
          ring.push(c * 5 + row);
    const match = ring.filter((n) => grid[Math.floor(n / 5)][n % 5] === symbol),
      threshold = radius === 1 ? 3 : 5;
    if (match.length >= threshold) {
      reward += stake * (symbol + 1) * (match.length - threshold + 1) * radius;
      wins.push([12, ...match]);
    }
    if (match.length === ring.length) full++;
  }
  const multiplier = full === 2 ? 3 : 1;
  return round(
    grid,
    reward * multiplier,
    wins,
    `太阳同心环 · ${full}圈满光${full === 2 ? " · 三倍日冕" : ""}`,
    multiplier,
  );
}

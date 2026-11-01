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
// Confetti scatters switch scoring from the middle parade line to the perimeter only.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 3, 8, rng),
    confetti = cells(grid, 7),
    wins: number[][] = [];
  let reward = 0;
  if (confetti.length >= 3) {
    const border = grid.flatMap((col, c) =>
      col.flatMap((_, r) =>
        c === 0 || c === 4 || r === 0 || r === 2 ? [c * 3 + r] : [],
      ),
    );
    for (let s = 0; s < 7; s++) {
      const match = border.filter((n) => grid[Math.floor(n / 3)][n % 3] === s);
      if (match.length >= 4) {
        reward += stake * (s + 1) * (match.length - 3) * 2;
        wins.push(match);
      }
    }
  } else {
    const hit = line(grid, [1, 1, 1, 1, 1]);
    if (hit) {
      reward = stake * (hit.symbol + 1) * 5;
      wins.push(hit.indices);
    }
  }
  return round(
    grid,
    reward,
    wins,
    confetti.length >= 3
      ? "彩纸庆典 · 仅边框四枚同色计奖"
      : "花车巡游 · 中排五连",
  );
}

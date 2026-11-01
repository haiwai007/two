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
// A star at the center powers crossing rays. Each outward ray stops at the first non-star.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 5, 7, rng),
    wins: number[][] = [];
  let reward = 0;
  const center = grid[2][2];
  if (center === 6) {
    const star = [12];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ]) {
      let depth = 0;
      for (let d = 1; d <= 2; d++) {
        const x = 2 + dx * d,
          y = 2 + dy * d;
        if (grid[x][y] !== 6) break;
        star.push(x * 5 + y);
        depth++;
      }
      reward += stake * depth * (depth + 1);
    }
    if (star.length > 1) wins.push(star);
  } else {
    const same = cells(grid, center);
    if (same.length >= 6) {
      reward = stake * (same.length - 5) * (center + 1);
      wins.push(same);
    }
  }
  return round(
    grid,
    reward,
    wins,
    center === 6 ? "中央星核 · 八向逐段射线" : "幸运同色 · 与中心同色六枚起奖",
  );
}

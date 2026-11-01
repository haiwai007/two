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
// Two dragons in one original reel ignite the next reel; expanded reels create 1024-way matches.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 4, 8, rng),
    board = clone(grid);
  let expanded = 0;
  for (let c = 0; c < 4; c++)
    if (grid[c].filter((s) => s === 7).length >= 2) {
      board[c + 1] = Array(4).fill(7);
      expanded++;
    }
  const wins: number[][] = [];
  let reward = 0;
  for (let symbol = 0; symbol < 7; symbol++) {
    let count = 0,
      ways = 1;
    const positions: number[] = [];
    for (let c = 0; c < 5; c++) {
      const match = board[c].flatMap((s, r) =>
        s === symbol || s === 7 ? [c * 4 + r] : [],
      );
      if (!match.length) break;
      count++;
      ways *= match.length;
      positions.push(...match);
    }
    if (count >= 3) {
      reward += Math.floor((stake * ways * (symbol + 1) * (count - 2)) / 8);
      wins.push(positions);
    }
  }
  const result = round(
    grid,
    reward,
    wins,
    `龙焰传承 · ${expanded}个后继扩展轴 · 1024路`,
  );
  if (expanded)
    result.steps = [{ grid: board, wins, reward, label: "后继龙焰展开" }];
  return result;
}

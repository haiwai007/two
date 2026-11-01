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
// A center pulse copies its symbol to immediate horizontal neighbors, then counts both edge runs.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(7, 3, 8, rng),
    board = clone(grid),
    pulse = grid[3][1] === 7;
  if (pulse) {
    board[2][1] = board[3][0];
    board[3][1] = board[3][0];
    board[4][1] = board[3][0];
  }
  const wins: number[][] = [];
  let reward = 0;
  for (let row = 0; row < 3; row++)
    for (const direction of [1, -1]) {
      const start = direction === 1 ? 0 : 6,
        symbol = board[start][row],
        indices = [start * 3 + row];
      for (let d = 1; d < 7; d++) {
        const c = start + d * direction;
        if (board[c][row] !== symbol) break;
        indices.push(c * 3 + row);
      }
      if (indices.length >= 3) {
        reward += stake * (indices.length - 2) * (symbol + 1);
        wins.push(indices);
      }
    }
  const result = round(
    grid,
    reward,
    wins,
    pulse ? "中央脉冲 · 双向边缘计奖" : "未来双向 · 左右分别连续三枚起",
  );
  if (pulse) result.steps = [{ grid: board, wins, reward, label: "脉冲复制" }];
  return result;
}

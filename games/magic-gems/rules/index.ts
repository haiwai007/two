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
// The central four gems rotate clockwise once; connected groups pay before and after the rotation.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(4, 4, 6, rng),
    evaluate = (board: Grid) => {
      const wins = groups(board).filter((g) => g.length >= 4);
      return {
        wins,
        reward: wins.reduce(
          (sum, g) =>
            sum +
            stake *
              (g.length - 3) *
              (board[Math.floor(g[0] / 4)][g[0] % 4] + 1),
          0,
        ),
      };
    };
  const before = evaluate(grid),
    board = clone(grid);
  board[2][1] = grid[1][1];
  board[2][2] = grid[2][1];
  board[1][2] = grid[2][2];
  board[1][1] = grid[1][2];
  const after = evaluate(board);
  return {
    ...round(
      grid,
      before.reward + after.reward,
      before.wins,
      "中央四宝石顺时针旋转 · 前后各计一次集群",
    ),
    steps: [{ grid: board, ...after, label: "宝石旋环 · 第二次集群评估" }],
  };
}

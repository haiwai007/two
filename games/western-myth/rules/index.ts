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
// Zeus expands a thunder reel to the adjacent middle symbol before zigzag evaluation.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(3, 5, 8, rng),
    board = clone(grid);
  let thunder = 0;
  for (let c = 0; c < 3; c++)
    if (grid[c].includes(7)) {
      const neighbor = grid[(c + 1) % 3][2];
      board[c] = Array(5).fill(neighbor === 7 ? 6 : neighbor);
      thunder++;
    }
  const wins: number[][] = [];
  let reward = 0;
  for (const path of [
    [0, 1, 2],
    [1, 2, 3],
    [2, 3, 4],
    [2, 1, 0],
    [3, 2, 1],
    [4, 3, 2],
  ]) {
    const hit = line(board, path);
    if (hit) {
      reward += stake * (hit.symbol + 1) * 2;
      wins.push(hit.indices);
    }
  }
  const result = round(grid, reward, wins, `雷神改写 · ${thunder}个雷霆整轴`);
  if (thunder)
    result.steps = [{ grid: board, wins, reward, label: "雷霆转轴同化" }];
  return result;
}

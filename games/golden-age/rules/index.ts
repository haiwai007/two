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
// Two three-reel lines, with a single free gold-reforging board when three crowns appear.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(3, 2, 6, rng),
    evaluate = (board: Grid) => {
      let reward = 0;
      const wins: number[][] = [];
      for (const path of [
        [0, 0, 0],
        [1, 1, 1],
      ]) {
        const hit = line(board, path);
        if (hit) {
          reward += stake * [2, 3, 5, 8, 12, 20][hit.symbol];
          wins.push(hit.indices);
        }
      }
      return { reward, wins };
    };
  const first = evaluate(grid),
    result = round(grid, first.reward, first.wins, "黄金双线 · 三轴双层");
  if (cells(grid, 5).length >= 3) {
    const board = grid.map((col) => col.map((s) => (s >= 3 ? 5 : s))),
      bonus = evaluate(board);
    result.reward += bonus.reward;
    result.steps = [{ grid: board, ...bonus, label: "三皇冠 · 免费重铸一次" }];
    result.feature = "黄金重铸 · 原局与重铸奖励累加";
  }
  return result;
}

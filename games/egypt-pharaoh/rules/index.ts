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
// Pyramidal paths pay; three scarabs award three enclosed free reveals.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 3, 9, rng);
  const evaluate = (board: Grid) => {
    let reward = 0;
    const wins: number[][] = [];
    for (const path of [
      [2, 1, 0, 1, 2],
      [0, 1, 2, 1, 0],
      [1, 1, 1, 1, 1],
    ]) {
      const hit = line(board, path, 7);
      if (hit && hit.symbol !== 8) {
        reward += stake * (hit.symbol + 2) * 2;
        wins.push(hit.indices);
      }
    }
    return { reward, wins };
  };
  const main = evaluate(grid),
    result = round(grid, main.reward, main.wins, "金字塔三径");
  if (cells(grid, 8).length >= 3) {
    result.steps = [];
    for (let i = 0; i < 3; i++) {
      const board = draw(5, 3, 8, rng),
        bonus = evaluate(board);
      result.reward += bonus.reward;
      result.steps.push({
        grid: board,
        ...bonus,
        label: `圣甲虫免费揭示 ${i + 1}/3`,
      });
    }
    result.feature = "圣甲虫触发三次免费揭示 · 本局已合并结算";
  }
  return result;
}

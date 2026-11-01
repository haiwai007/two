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
// Each row is an army; three matching troops score, and three winning armies unite.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 3, 7, rng),
    wins: number[][] = [];
  let reward = 0,
    armies = 0;
  for (let row = 0; row < 3; row++) {
    const counts = new Map<number, number[]>();
    for (let c = 0; c < 5; c++) {
      const symbol = grid[c][row];
      counts.set(symbol, [...(counts.get(symbol) ?? []), c * 3 + row]);
    }
    let victory = false;
    for (const [symbol, positions] of counts)
      if (positions.length >= 3) {
        reward += stake * (symbol + 1) * (positions.length - 2);
        wins.push(positions);
        victory = true;
      }
    if (victory) armies++;
  }
  const multiplier = armies === 3 ? 3 : 1;
  return round(
    grid,
    reward * multiplier,
    wins,
    armies === 3 ? "三军会盟 · 所有奖励三倍" : `军阵夺旗 · ${armies}军获胜`,
    multiplier,
  );
}

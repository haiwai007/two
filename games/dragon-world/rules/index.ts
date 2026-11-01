import {
  secureInt,
  type RandomInt,
  type Round,
} from "../../../game-engine/random.ts";
export function dragon(stake: number, rng: RandomInt = secureInt): Round {
  const grid = Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => rng(10)),
  );
  let reward = 0;
  const wins: number[][] = [];
  for (let symbol = 0; symbol < 8; symbol++) {
    let ways = 1,
      count = 0;
    const cells: number[] = [];
    for (let c = 0; c < 5; c++) {
      const matches = grid[c]
        .map((s, r) => (s === symbol || s === 8 ? r : -1))
        .filter((r) => r >= 0);
      if (!matches.length) break;
      count++;
      ways *= matches.length;
      cells.push(...matches.map((r) => c * 3 + r));
    }
    if (count >= 3) {
      reward += Math.floor(
        (stake * ways * [1, 2, 3, 4, 5, 6, 8, 10][symbol] * (count - 2)) / 3,
      );
      wins.push(cells);
    }
  }
  const scatters = grid.flat().filter((s) => s === 9).length;
  const multiplier = scatters >= 3 ? 2 : 1;
  reward *= multiplier;
  return {
    grid,
    reward,
    wins,
    feature: scatters >= 3 ? "龙珠共鸣 · 本局奖励翻倍" : "从左至右 · 243 路",
    multiplier,
  };
}

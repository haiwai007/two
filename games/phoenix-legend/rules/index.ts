import {
  secureInt,
  type RandomInt,
  type Round,
} from "../../../game-engine/random.ts";
import { draw, clone, groups } from "../../../game-engine/primitives.ts";
export function phoenix(stake: number, rng: RandomInt = secureInt): Round {
  let grid = draw(6, 5, 7, rng);
  const initial = clone(grid),
    cascades: number[][][] = [],
    stages: NonNullable<Round["steps"]> = [];
  let reward = 0;
  for (let wave = 1; wave <= 5; wave++) {
    const wins = groups(grid).filter((g) => g.length >= 5);
    if (!wins.length) break;
    const value = wins.reduce(
      (sum, g) =>
        sum +
        stake *
          (g.length - 4) *
          (grid[Math.floor(g[0] / 5)][g[0] % 5] + 1) *
          wave,
      0,
    );
    reward += value;
    stages.push({
      grid: clone(grid),
      wins,
      reward: value,
      label: `凤凰涅槃 · 第${wave}轮`,
    });
    const remove = new Set(wins.flat());
    grid = grid.map((col, c) => {
      const keep = col.filter((_, r) => !remove.has(c * 5 + r));
      return [
        ...Array.from({ length: 5 - keep.length }, () => rng(7)),
        ...keep,
      ];
    });
    cascades.push(clone(grid));
  }
  return {
    grid: initial,
    reward,
    wins: stages[0]?.wins ?? [],
    cascades,
    steps: stages.slice(1),
    feature: stages.length
      ? `涅槃连消 ${stages.length} 次`
      : "相邻五枚 · 集群消除",
    multiplier: Math.min(stages.length + 1, 5),
  };
}

import {
  secureInt,
  type RandomInt,
  type Round,
} from "../../../game-engine/random.ts";
export function phoenix(stake: number, rng: RandomInt = secureInt): Round {
  let grid = Array.from({ length: 6 }, () =>
    Array.from({ length: 5 }, () => rng(7)),
  );
  const first = grid.map((c) => [...c]),
    cascades: number[][][] = [],
    wins: number[][] = [];
  let reward = 0,
    level = 1;
  for (; level <= 5; level++) {
    const seen = new Set<number>(),
      remove = new Set<number>();
    for (let c = 0; c < 6; c++)
      for (let r = 0; r < 5; r++) {
        const start = c * 5 + r;
        if (seen.has(start)) continue;
        const group: number[] = [],
          queue = [start];
        seen.add(start);
        while (queue.length) {
          const n = queue.pop()!;
          group.push(n);
          const x = Math.floor(n / 5),
            y = n % 5;
          for (const [a, b] of [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
          ]) {
            const id = a * 5 + b;
            if (
              a >= 0 &&
              a < 6 &&
              b >= 0 &&
              b < 5 &&
              !seen.has(id) &&
              grid[a][b] === grid[c][r]
            ) {
              seen.add(id);
              queue.push(id);
            }
          }
        }
        if (group.length >= 5) {
          group.forEach((x) => remove.add(x));
          wins.push(group);
          reward += stake * (group.length - 4) * (grid[c][r] + 1) * level;
        }
      }
    if (!remove.size) break;
    grid = grid.map((col, c) => {
      const remain = col.filter((_, r) => !remove.has(c * 5 + r));
      return [
        ...Array.from({ length: 5 - remain.length }, () => rng(7)),
        ...remain,
      ];
    });
    cascades.push(grid.map((c) => [...c]));
  }
  return {
    grid: first,
    reward,
    wins,
    cascades,
    feature: cascades.length
      ? `涅槃连消 ${cascades.length} 次`
      : "相邻五枚 · 集群消除",
    multiplier: Math.min(level, 5),
  };
}

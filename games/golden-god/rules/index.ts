import {
  secureInt,
  type RandomInt,
  type Round,
} from "../../../game-engine/random.ts";
export function golden(stake: number, rng: RandomInt = secureInt): Round {
  const grid = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => rng(8)),
  );
  const paths = [
    [0, 0, 0],
    [1, 1, 1],
    [2, 2, 2],
    [0, 1, 2],
    [2, 1, 0],
  ];
  let reward = 0;
  const wins: number[][] = [];
  for (const path of paths) {
    const cells = path.map((r, c) => grid[c][r]);
    const symbol = cells.find((x) => x !== 7) ?? 7;
    if (cells.every((x) => x === symbol || x === 7)) {
      reward += stake * [2, 3, 4, 5, 7, 10, 15, 20][symbol];
      wins.push(path.map((r, c) => c * 3 + r));
    }
  }
  return {
    grid,
    reward,
    wins,
    feature: wins.length ? "五线连珠" : "未形成连线",
    multiplier: 1,
  };
}

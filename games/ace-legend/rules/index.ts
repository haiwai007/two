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
// Card ranks are slot symbols; each complete row pays its rank multiplicity pattern, with no card decisions.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 3, 13, rng),
    wins: number[][] = [];
  let reward = 0;
  for (let row = 0; row < 3; row++) {
    const hand = grid.map((col) => col[row]),
      counts = [...new Set(hand)]
        .map((rank) => hand.filter((s) => s === rank).length)
        .sort((a, b) => b - a);
    const pay =
      counts[0] === 5
        ? 50
        : counts[0] === 4
          ? 15
          : counts[0] === 3 && counts[1] === 2
            ? 8
            : counts[0] === 3
              ? 4
              : counts[0] === 2 && counts[1] === 2
                ? 3
                : counts[0] === 2
                  ? 1
                  : 0;
    if (pay) {
      reward += stake * pay;
      wins.push(Array.from({ length: 5 }, (_, c) => c * 3 + row));
    }
  }
  const aces = cells(grid, 12);
  if (aces.length >= 3) {
    reward += stake * aces.length * 2;
    wins.push(aces);
  }
  return round(
    grid,
    reward,
    wins,
    "王牌转轴 · 每行按重复点数型计奖 · 非棋牌游戏",
  );
}

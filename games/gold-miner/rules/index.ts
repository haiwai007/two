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
// Gold nuggets lock in place while two free respins refill only empty cells.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  let grid = draw(5, 3, 9, rng);
  const initial = clone(grid),
    locked = new Map<number, number>(),
    steps: NonNullable<Round["steps"]> = [];
  const hold = () => {
    grid.forEach((col, c) =>
      col.forEach((s, r) => {
        if (s <= 2) locked.set(c * 3 + r, (s + 1) * stake);
      }),
    );
  };
  hold();
  if (locked.size >= 3) {
    for (let turn = 0; turn < 2; turn++) {
      grid = grid.map((col, c) =>
        col.map((s, r) => (locked.has(c * 3 + r) ? s : rng(9))),
      );
      hold();
      steps.push({
        grid: clone(grid),
        wins: [[...locked.keys()]],
        reward: 0,
        label: `矿脉锁定 · 免费重转 ${turn + 1}/2`,
      });
    }
  }
  const reward =
    locked.size >= 6
      ? [...locked.values()].reduce((a, b) => a + b, 0) *
        (locked.size === 15 ? 3 : 1)
      : 0;
  if (steps.length) steps[steps.length - 1].reward = reward;
  return {
    ...round(
      initial,
      reward,
      [],
      `锁定${locked.size}枚金矿 · 六枚起收集${locked.size === 15 ? " · 满盘三倍" : ""}`,
    ),
    steps,
  };
}

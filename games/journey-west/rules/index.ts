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
// The travelling hero substitutes only along a randomly chosen mountain path.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(5, 4, 8, rng),
    route = [rng(4)];
  for (let c = 1; c < 5; c++)
    route.push(Math.max(0, Math.min(3, route[c - 1] + rng(3) - 1)));
  const symbol = grid[0][route[0]],
    wins: number[][] = [];
  let length = 1;
  while (
    length < 5 &&
    (grid[length][route[length]] === symbol ||
      grid[length][route[length]] === 7)
  )
    length++;
  let reward = length >= 3 ? stake * (length - 2) * (symbol + 2) : 0;
  if (length >= 3) wins.push(route.slice(0, length).map((r, c) => c * 4 + r));
  const peaches = cells(grid, 6);
  if (peaches.length >= 4) {
    reward += stake * peaches.length;
    wins.push(peaches);
  }
  return round(
    grid,
    reward,
    wins,
    `取经路线 ${route.map((n) => n + 1).join("→")} · ${length}站相连`,
  );
}

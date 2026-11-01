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
// Every reel rises by a different tide offset; leftmost horizontal runs then receive bubble multipliers.
export function play(stake: number, rng: RandomInt = secureInt): Round {
  const grid = draw(4, 6, 8, rng),
    board = grid.map((col, c) => col.map((_, row) => col[(row + c + 1) % 6])),
    wins: number[][] = [];
  const bubbles = cells(grid, 7).length,
    multiplier = bubbles >= 5 ? 2 : 1;
  let reward = 0;
  for (let row = 0; row < 6; row++) {
    const symbol = board[0][row],
      positions = [row];
    for (let c = 1; c < 4; c++) {
      if (board[c][row] !== symbol) break;
      positions.push(c * 6 + row);
    }
    if (positions.length >= 3) {
      reward += stake * (symbol + 1) * (positions.length - 2) * multiplier;
      wins.push(positions);
    }
  }
  if (bubbles >= 5) reward += stake * bubbles;
  return {
    ...round(
      grid,
      reward,
      [],
      `潮汐错位 · ${bubbles}枚气泡 · ${multiplier}倍连线`,
      multiplier,
    ),
    steps: [{ grid: board, wins, reward, label: "各轴上浮后的海流连线" }],
  };
}

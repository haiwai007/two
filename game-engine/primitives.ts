import type { RandomInt, Round } from "./random.ts";
export type Grid = number[][];
export const draw = (
  columns: number,
  rows: number,
  symbols: number,
  rng: RandomInt,
): Grid =>
  Array.from({ length: columns }, () =>
    Array.from({ length: rows }, () => rng(symbols)),
  );
export const clone = (grid: Grid): Grid => grid.map((col) => [...col]);
export const cells = (grid: Grid, symbol: number): number[] =>
  grid.flatMap((col, c) =>
    col.flatMap((s, r) => (s === symbol ? [c * col.length + r] : [])),
  );
export function line(
  grid: Grid,
  path: number[],
  wild = -1,
): { symbol: number; indices: number[] } | null {
  const values = path.map((r, c) => grid[c][r]);
  const symbol = values.find((s) => s !== wild) ?? wild;
  return values.every((s) => s === symbol || s === wild)
    ? { symbol, indices: path.map((r, c) => c * grid[c].length + r) }
    : null;
}
export function runs(
  values: number[],
): { symbol: number; start: number; length: number }[] {
  const result = [];
  for (let i = 0; i < values.length; ) {
    let end = i + 1;
    while (end < values.length && values[end] === values[i]) end++;
    result.push({ symbol: values[i], start: i, length: end - i });
    i = end;
  }
  return result;
}
export function groups(grid: Grid, diagonal = false): number[][] {
  const rows = grid[0].length,
    seen = new Set<number>(),
    result: number[][] = [];
  for (let c = 0; c < grid.length; c++)
    for (let r = 0; r < rows; r++) {
      const start = c * rows + r;
      if (seen.has(start)) continue;
      const queue = [start],
        group = [];
      seen.add(start);
      while (queue.length) {
        const n = queue.pop()!;
        group.push(n);
        const x = Math.floor(n / rows),
          y = n % rows;
        const offsets = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          ...(diagonal
            ? [
                [1, 1],
                [1, -1],
                [-1, 1],
                [-1, -1],
              ]
            : []),
        ];
        for (const [dx, dy] of offsets) {
          const a = x + dx,
            b = y + dy,
            id = a * rows + b;
          if (
            a >= 0 &&
            a < grid.length &&
            b >= 0 &&
            b < rows &&
            !seen.has(id) &&
            grid[a][b] === grid[x][y]
          ) {
            seen.add(id);
            queue.push(id);
          }
        }
      }
      result.push(group);
    }
  return result;
}
export const round = (
  grid: Grid,
  reward: number,
  wins: number[][],
  feature: string,
  multiplier = 1,
): Round => ({ grid, reward: Math.floor(reward), wins, feature, multiplier });

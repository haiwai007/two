export type RandomInt = (max: number) => number;
export type Round = {
  grid: number[][];
  reward: number;
  gameVersion?: string;
  wins: number[][];
  feature: string;
  cascades?: number[][][];
  multiplier: number;
  steps?: {
    grid: number[][];
    wins: number[][];
    reward: number;
    label: string;
  }[];
  stake?: number;
  scatters?: number[];
  freeSpins?: { spins: number; reward: number };
};
export function secureInt(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 0xffffffff)
    throw new Error("Invalid range");
  const limit = Math.floor(0x100000000 / max) * max,
    a = new Uint32Array(1);
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= limit);
  return a[0] % max;
}

import type { RandomInt, Round } from "./random.ts";

type Step = NonNullable<Round["steps"]>[number];
type Play = (stake: number, rng: RandomInt) => Round;

// [pay scale in basis points, symbol count]; the scatter uses index = symbol count.
// Pay scales are calibrated by scripts/simulate-rtp.ts towards TARGET_RTP.
export const TARGET_RTP = 0.96;
export const tuning: Record<string, readonly [number, number]> = {
  "golden-god": [2744, 8],
  "dragon-world": [1349, 10],
  "phoenix-legend": [8409, 7],
  "divine-dragon": [5097, 8],
  "egypt-pharaoh": [35449, 9],
  "journey-west": [6233, 8],
  "three-kingdoms": [4042, 7],
  "pirate-treasure": [1276, 8],
  "fantasy-forest": [5281, 7],
  "magic-academy": [4465, 6],
  "gem-kingdom": [35564, 6],
  "fruit-party": [828, 8],
  "candy-world": [3910, 6],
  "lucky-star": [5237, 7],
  "gold-miner": [469, 9],
  "eastern-myth": [1913, 6],
  "western-myth": [2951, 8],
  "future-world": [17398, 8],
  "animal-kingdom": [9589, 6],
  "festival": [14025, 8],
  "mysterious-vault": [5032, 6],
  "dragon-legend": [173, 8],
  "golden-age": [6969, 6],
  "sun-temple": [7611, 7],
  "magic-gems": [3214, 6],
  "star-journey": [15948, 7],
  "deep-sea": [5709, 8],
  "ace-legend": [2769, 13],
  "dream-garden": [2047, 7],
  "fortune-gate": [8926, 8],
};
export const FREE_SPINS: Record<number, number> = { 3: 3, 4: 5, 5: 7 };
const TRIGGER_RATE = 1 / 90;

function atLeastThree(n: number, p: number) {
  const q = 1 - p;
  return 1 - q ** n - n * p * q ** (n - 1) - ((n * (n - 1)) / 2) * p * p * q ** (n - 2);
}
const chanceCache = new Map<number, number>();
export function scatterChance(cells: number) {
  let cached = chanceCache.get(cells);
  if (cached === undefined) {
    let lo = 0,
      hi = 0.5;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (atLeastThree(cells, mid) < TRIGGER_RATE) lo = mid;
      else hi = mid;
    }
    cached = Math.round(lo * 10000);
    chanceCache.set(cells, cached);
  }
  return cached;
}

const stick = (grid: number[][], cells: number[], wins: number[][], scatter: number) => {
  const won = new Set(wins.flat()),
    rows = grid[0].length,
    next = grid.map((col) => [...col]);
  for (const n of cells)
    if (!won.has(n)) next[Math.floor(n / rows)][n % rows] = scatter;
  return next;
};

export function enhance(id: string, stake: number, rng: RandomInt, play: Play): Round {
  const [payBp, scatter] = tuning[id];
  const pay = (n: number) => Math.floor((n * payBp) / 10000);
  const base = play(stake, rng),
    rows = base.grid[0].length,
    busy = new Set(base.wins.flat()),
    chance = scatterChance(Math.max(3, base.grid.length * rows - busy.size)),
    scatters: number[] = [];
  const grid = base.grid.map((col, c) =>
    col.map((symbol, r) => {
      const n = c * rows + r;
      if (busy.has(n) || rng(10000) >= chance) return symbol;
      scatters.push(n);
      return scatter;
    }),
  );
  let steps: Step[] | undefined =
    base.steps?.map((s) => ({
      ...s,
      reward: pay(s.reward),
      grid: stick(s.grid, scatters, s.wins, scatter),
    })) ??
    base.cascades?.map((g, i) => ({
      grid: stick(g, scatters, [], scatter),
      wins: [],
      reward: 0,
      label: `连消补充 ${i + 1}`,
    }));
  const result: Round = {
    ...base,
    grid,
    reward: pay(base.reward),
    stake,
    scatters,
    cascades: base.cascades?.map((g) => stick(g, scatters, [], scatter)),
    steps,
  };
  const spins = FREE_SPINS[Math.min(scatters.length, 5)] ?? 0;
  if (spins) {
    steps = steps ? [...steps] : [];
    let bonus = 0;
    for (let i = 0; i < spins; i++) {
      const round = play(stake, rng),
        multiplier = i + 1,
        reward = pay(round.reward) * multiplier;
      bonus += reward;
      steps.push({
        grid: round.grid,
        wins: round.wins,
        reward,
        label: `免费旋转 ${i + 1}/${spins} · ×${multiplier}`,
      });
    }
    result.steps = steps;
    result.reward += bonus;
    result.multiplier = Math.max(base.multiplier, spins);
    result.freeSpins = { spins, reward: bonus };
    result.feature = `${scatters.length}个夺宝 · 免费旋转${spins}次 · 倍数×1→×${spins}`;
  }
  if (!result.steps) delete result.steps;
  if (!result.cascades) delete result.cascades;
  return result;
}

// Usage: node --experimental-strip-types scripts/simulate-rtp.ts [rounds]
import { calculate, implementedGameIds } from "../game-engine/rules.ts";
import { TARGET_RTP, tuning } from "../game-engine/features.ts";
const rounds = Number(process.argv[2] ?? 100000);
let seed = 20261102;
const rng = (max: number) => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) % max;
};
console.log("game\tRTP\thit\tfree-spins\tmax(x)\tsuggested-bp");
for (const id of implementedGameIds) {
  let paid = 0,
    hits = 0,
    triggers = 0,
    max = 0;
  for (let i = 0; i < rounds; i++) {
    const r = calculate(id, 10, rng);
    paid += r.reward;
    if (r.reward > 0) hits++;
    if (r.freeSpins) triggers++;
    max = Math.max(max, r.reward / 10);
  }
  const rtp = paid / (rounds * 10);
  console.log(
    [
      id,
      (rtp * 100).toFixed(1) + "%",
      ((hits / rounds) * 100).toFixed(1) + "%",
      "1/" + Math.round(rounds / Math.max(1, triggers)),
      max,
      Math.round((tuning[id][0] * TARGET_RTP) / rtp),
    ].join("\t"),
  );
}

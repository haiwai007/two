import { golden } from "../games/golden-god/rules/index.ts";
import { dragon } from "../games/dragon-world/rules/index.ts";
import { phoenix } from "../games/phoenix-legend/rules/index.ts";
import { secureInt, type RandomInt, type Round } from "./random.ts";
export { golden, dragon, phoenix, secureInt };
export type { RandomInt, Round };
export function calculate(
  id: string,
  stake: number,
  rng: RandomInt = secureInt,
): Round {
  if (!Number.isSafeInteger(stake) || ![10, 20, 50, 100].includes(stake))
    throw new Error("Invalid stake");
  const fn = (
    {
      "golden-god": golden,
      "dragon-world": dragon,
      "phoenix-legend": phoenix,
    } as Record<string, typeof golden>
  )[id];
  if (!fn) throw new Error("Game is not implemented");
  return fn(stake, rng);
}

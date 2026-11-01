import { golden as rule0 } from "../games/golden-god/rules/index.ts";
import { dragon as rule1 } from "../games/dragon-world/rules/index.ts";
import { phoenix as rule2 } from "../games/phoenix-legend/rules/index.ts";
import { play as rule3 } from "../games/divine-dragon/rules/index.ts";
import { play as rule4 } from "../games/egypt-pharaoh/rules/index.ts";
import { play as rule5 } from "../games/journey-west/rules/index.ts";
import { play as rule6 } from "../games/three-kingdoms/rules/index.ts";
import { play as rule7 } from "../games/pirate-treasure/rules/index.ts";
import { play as rule8 } from "../games/fantasy-forest/rules/index.ts";
import { play as rule9 } from "../games/magic-academy/rules/index.ts";
import { play as rule10 } from "../games/gem-kingdom/rules/index.ts";
import { play as rule11 } from "../games/fruit-party/rules/index.ts";
import { play as rule12 } from "../games/candy-world/rules/index.ts";
import { play as rule13 } from "../games/lucky-star/rules/index.ts";
import { play as rule14 } from "../games/gold-miner/rules/index.ts";
import { play as rule15 } from "../games/eastern-myth/rules/index.ts";
import { play as rule16 } from "../games/western-myth/rules/index.ts";
import { play as rule17 } from "../games/future-world/rules/index.ts";
import { play as rule18 } from "../games/animal-kingdom/rules/index.ts";
import { play as rule19 } from "../games/festival/rules/index.ts";
import { play as rule20 } from "../games/mysterious-vault/rules/index.ts";
import { play as rule21 } from "../games/dragon-legend/rules/index.ts";
import { play as rule22 } from "../games/golden-age/rules/index.ts";
import { play as rule23 } from "../games/sun-temple/rules/index.ts";
import { play as rule24 } from "../games/magic-gems/rules/index.ts";
import { play as rule25 } from "../games/star-journey/rules/index.ts";
import { play as rule26 } from "../games/deep-sea/rules/index.ts";
import { play as rule27 } from "../games/ace-legend/rules/index.ts";
import { play as rule28 } from "../games/dream-garden/rules/index.ts";
import { play as rule29 } from "../games/fortune-gate/rules/index.ts";
import { secureInt, type RandomInt, type Round } from "./random.ts";
export { secureInt };
export type { RandomInt, Round };
export { golden } from "../games/golden-god/rules/index.ts";
export { dragon } from "../games/dragon-world/rules/index.ts";
export { phoenix } from "../games/phoenix-legend/rules/index.ts";
const rules: Record<string, (stake: number, rng?: RandomInt) => Round> = {
  "golden-god": rule0,
  "dragon-world": rule1,
  "phoenix-legend": rule2,
  "divine-dragon": rule3,
  "egypt-pharaoh": rule4,
  "journey-west": rule5,
  "three-kingdoms": rule6,
  "pirate-treasure": rule7,
  "fantasy-forest": rule8,
  "magic-academy": rule9,
  "gem-kingdom": rule10,
  "fruit-party": rule11,
  "candy-world": rule12,
  "lucky-star": rule13,
  "gold-miner": rule14,
  "eastern-myth": rule15,
  "western-myth": rule16,
  "future-world": rule17,
  "animal-kingdom": rule18,
  festival: rule19,
  "mysterious-vault": rule20,
  "dragon-legend": rule21,
  "golden-age": rule22,
  "sun-temple": rule23,
  "magic-gems": rule24,
  "star-journey": rule25,
  "deep-sea": rule26,
  "ace-legend": rule27,
  "dream-garden": rule28,
  "fortune-gate": rule29,
};
export const programVersion = "0.2.0";
export const implementedGameIds = Object.keys(rules);
export function isImplementedGame(id: string) {
  return Object.hasOwn(rules, id);
}
export function calculate(
  id: string,
  stake: number,
  rng: RandomInt = secureInt,
): Round {
  if (!Number.isSafeInteger(stake) || ![10, 20, 50, 100].includes(stake))
    throw new Error("Invalid stake");
  if (!isImplementedGame(id)) throw new Error("Game is not implemented");
  const result = rules[id](stake, rng);
  if (
    !Number.isSafeInteger(result.reward) ||
    result.reward < 0 ||
    result.reward > 100000000
  )
    throw new Error("Invalid calculated reward");
  return { ...result, gameVersion: "0.2.0" };
}

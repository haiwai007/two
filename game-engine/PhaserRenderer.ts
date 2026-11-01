import * as Phaser from "phaser";
import type { GameScene } from "./Scene";
import { Main as Scene0 } from "../games/golden-god/scenes/Main";
import { Main as Scene1 } from "../games/dragon-world/scenes/Main";
import { Main as Scene2 } from "../games/phoenix-legend/scenes/Main";
import { Main as Scene3 } from "../games/divine-dragon/scenes/Main";
import { Main as Scene4 } from "../games/egypt-pharaoh/scenes/Main";
import { Main as Scene5 } from "../games/journey-west/scenes/Main";
import { Main as Scene6 } from "../games/three-kingdoms/scenes/Main";
import { Main as Scene7 } from "../games/pirate-treasure/scenes/Main";
import { Main as Scene8 } from "../games/fantasy-forest/scenes/Main";
import { Main as Scene9 } from "../games/magic-academy/scenes/Main";
import { Main as Scene10 } from "../games/gem-kingdom/scenes/Main";
import { Main as Scene11 } from "../games/fruit-party/scenes/Main";
import { Main as Scene12 } from "../games/candy-world/scenes/Main";
import { Main as Scene13 } from "../games/lucky-star/scenes/Main";
import { Main as Scene14 } from "../games/gold-miner/scenes/Main";
import { Main as Scene15 } from "../games/eastern-myth/scenes/Main";
import { Main as Scene16 } from "../games/western-myth/scenes/Main";
import { Main as Scene17 } from "../games/future-world/scenes/Main";
import { Main as Scene18 } from "../games/animal-kingdom/scenes/Main";
import { Main as Scene19 } from "../games/festival/scenes/Main";
import { Main as Scene20 } from "../games/mysterious-vault/scenes/Main";
import { Main as Scene21 } from "../games/dragon-legend/scenes/Main";
import { Main as Scene22 } from "../games/golden-age/scenes/Main";
import { Main as Scene23 } from "../games/sun-temple/scenes/Main";
import { Main as Scene24 } from "../games/magic-gems/scenes/Main";
import { Main as Scene25 } from "../games/star-journey/scenes/Main";
import { Main as Scene26 } from "../games/deep-sea/scenes/Main";
import { Main as Scene27 } from "../games/ace-legend/scenes/Main";
import { Main as Scene28 } from "../games/dream-garden/scenes/Main";
import { Main as Scene29 } from "../games/fortune-gate/scenes/Main";
const scenes: Record<string, () => GameScene> = {
  "golden-god": () => new Scene0(),
  "dragon-world": () => new Scene1(),
  "phoenix-legend": () => new Scene2(),
  "divine-dragon": () => new Scene3(),
  "egypt-pharaoh": () => new Scene4(),
  "journey-west": () => new Scene5(),
  "three-kingdoms": () => new Scene6(),
  "pirate-treasure": () => new Scene7(),
  "fantasy-forest": () => new Scene8(),
  "magic-academy": () => new Scene9(),
  "gem-kingdom": () => new Scene10(),
  "fruit-party": () => new Scene11(),
  "candy-world": () => new Scene12(),
  "lucky-star": () => new Scene13(),
  "gold-miner": () => new Scene14(),
  "eastern-myth": () => new Scene15(),
  "western-myth": () => new Scene16(),
  "future-world": () => new Scene17(),
  "animal-kingdom": () => new Scene18(),
  festival: () => new Scene19(),
  "mysterious-vault": () => new Scene20(),
  "dragon-legend": () => new Scene21(),
  "golden-age": () => new Scene22(),
  "sun-temple": () => new Scene23(),
  "magic-gems": () => new Scene24(),
  "star-journey": () => new Scene25(),
  "deep-sea": () => new Scene26(),
  "ace-legend": () => new Scene27(),
  "dream-garden": () => new Scene28(),
  "fortune-gate": () => new Scene29(),
};
export function createGame(
  parent: HTMLElement,
  id: string,
  backgroundAssetId?: string,
  symbolAssets: Record<string, string> = {},
) {
  if (!Object.hasOwn(scenes, id)) throw new Error("Unknown program");
  return new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: 900,
    height: 680,
    scene: scenes[id]().useBackground(backgroundAssetId, symbolAssets),
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 30, smoothStep: false },
    audio: { noAudio: true },
    render: { antialias: true },
  });
}

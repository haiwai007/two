import * as Phaser from "phaser";
import { GoldenScene } from "../games/golden-god/scenes/Main";
import { DragonScene } from "../games/dragon-world/scenes/Main";
import { PhoenixScene } from "../games/phoenix-legend/scenes/Main";
export function createGame(parent: HTMLElement, id: string) {
  const scene =
    id === "golden-god"
      ? new GoldenScene()
      : id === "dragon-world"
        ? new DragonScene()
        : new PhoenixScene();
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 900,
    height: 680,
    transparent: false,
    scene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    render: { antialias: true },
  });
}

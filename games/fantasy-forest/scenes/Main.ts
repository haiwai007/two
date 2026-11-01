import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("fantasy-forest");
  }
  create() {
    super.create();
    for (let n = 0; n < 9; n++) {
      const flame = this.add.triangle(
        60 + n * 95,
        125,
        0,
        9,
        4,
        0,
        8,
        9,
        4821611,
        0.4,
      );
      this.tweens.add({
        targets: flame,
        y: 94,
        alpha: 0,
        repeat: -1,
        delay: n * 100,
        duration: 1280,
      });
    }
  }
}

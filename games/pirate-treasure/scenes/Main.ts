import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("pirate-treasure");
  }
  create() {
    super.create();
    for (let n = 0; n < 4; n++) {
      const orb = this.add.circle(80 + n * 20, 105, 3, 4290723, 0.5);
      this.tweens.add({
        targets: orb,
        y: 85,
        alpha: 0.1,
        yoyo: true,
        repeat: -1,
        delay: n * 150,
        duration: 1020,
      });
    }
  }
}

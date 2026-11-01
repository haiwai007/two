import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("eastern-myth");
  }
  create() {
    super.create();
    const wave = this.add.ellipse(70, 100, 60, 12, 5802890, 0.3);
    this.tweens.add({
      targets: wave,
      scaleX: 1.5,
      alpha: 0.08,
      yoyo: true,
      repeat: -1,
      duration: 1550,
    });
  }
}

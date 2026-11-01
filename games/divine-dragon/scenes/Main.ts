import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("divine-dragon");
  }
  create() {
    super.create();
    const wave = this.add.ellipse(85, 100, 60, 12, 6394972, 0.3);
    this.tweens.add({
      targets: wave,
      scaleX: 1.5,
      alpha: 0.08,
      yoyo: true,
      repeat: -1,
      duration: 1430,
    });
  }
}

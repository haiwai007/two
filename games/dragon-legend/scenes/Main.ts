import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("dragon-legend");
  }
  create() {
    super.create();
    const wave = this.add.ellipse(75, 100, 60, 12, 4427146, 0.3);
    this.tweens.add({
      targets: wave,
      scaleX: 1.5,
      alpha: 0.08,
      yoyo: true,
      repeat: -1,
      duration: 1610,
    });
  }
}

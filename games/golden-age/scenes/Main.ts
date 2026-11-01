import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("golden-age");
  }
  create() {
    super.create();
    const ray = this.add.rectangle(80, 100, 35, 4, 11305540, 0.6);
    this.tweens.add({
      targets: ray,
      angle: 180,
      yoyo: true,
      repeat: -1,
      duration: 2120,
    });
  }
}

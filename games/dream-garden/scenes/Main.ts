import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("dream-garden");
  }
  create() {
    super.create();
    const ray = this.add.rectangle(85, 100, 35, 4, 7114855, 0.6);
    this.tweens.add({
      targets: ray,
      angle: 180,
      yoyo: true,
      repeat: -1,
      duration: 2180,
    });
  }
}

import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("gem-kingdom");
  }
  create() {
    super.create();
    const ray = this.add.rectangle(70, 100, 35, 4, 6132143, 0.6);
    this.tweens.add({
      targets: ray,
      angle: 180,
      yoyo: true,
      repeat: -1,
      duration: 2000,
    });
  }
}

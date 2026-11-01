import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("western-myth");
  }
  create() {
    super.create();
    const ray = this.add.rectangle(75, 100, 35, 4, 7039665, 0.6);
    this.tweens.add({
      targets: ray,
      angle: 180,
      yoyo: true,
      repeat: -1,
      duration: 2060,
    });
  }
}

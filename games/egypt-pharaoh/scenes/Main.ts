import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("egypt-pharaoh");
  }
  create() {
    super.create();
    const ray = this.add.rectangle(90, 100, 35, 4, 10717513, 0.6);
    this.tweens.add({
      targets: ray,
      angle: 180,
      yoyo: true,
      repeat: -1,
      duration: 1940,
    });
  }
}

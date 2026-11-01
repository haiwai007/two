import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("golden-god");
  }
  create() {
    super.create();
    const seal = this.add.star(70, 92, 5, 12, 23, 13212216, 0.5);
    this.tweens.add({ targets: seal, angle: 360, duration: 7000, repeat: -1 });
  }
}

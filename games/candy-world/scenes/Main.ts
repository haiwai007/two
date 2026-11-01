import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("candy-world");
  }
  create() {
    super.create();
    const seal = this.add.star(80, 92, 5, 12, 23, 11951503, 0.5);
    this.tweens.add({ targets: seal, angle: 360, duration: 8320, repeat: -1 });
  }
}

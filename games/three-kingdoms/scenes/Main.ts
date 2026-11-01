import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("three-kingdoms");
  }
  create() {
    super.create();
    const seal = this.add.star(75, 92, 5, 12, 23, 9264477, 0.5);
    this.tweens.add({ targets: seal, angle: 360, duration: 7660, repeat: -1 });
  }
}

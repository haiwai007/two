import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("animal-kingdom");
  }
  create() {
    super.create();
    const seal = this.add.star(85, 92, 5, 12, 23, 8487751, 0.5);
    this.tweens.add({ targets: seal, angle: 360, duration: 8980, repeat: -1 });
  }
}

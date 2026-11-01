import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("magic-gems");
  }
  create() {
    super.create();
    const seal = this.add.star(90, 92, 5, 12, 23, 6589832, 0.5);
    this.tweens.add({ targets: seal, angle: 360, duration: 9640, repeat: -1 });
  }
}

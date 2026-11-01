import { GameScene } from "../../../game-engine/Scene";
export class DragonScene extends GameScene {
  constructor() {
    super("dragon-world");
  }
  create() {
    super.create();
    for (let i = 0; i < 4; i++) {
      const cloud = this.add.ellipse(
        120 + i * 220,
        118,
        110,
        10,
        0x67c1bf,
        0.12,
      );
      this.tweens.add({
        targets: cloud,
        x: cloud.x + 50,
        yoyo: true,
        repeat: -1,
        duration: 3000 + i * 600,
      });
    }
  }
}

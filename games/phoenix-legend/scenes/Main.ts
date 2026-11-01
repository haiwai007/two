import { GameScene } from "../../../game-engine/Scene";
export class PhoenixScene extends GameScene {
  constructor() {
    super("phoenix-legend");
  }
  create() {
    super.create();
    for (let i = 0; i < 12; i++) {
      const ember = this.add.circle(100 + i * 63, 118, 2, 0xd99cdb, 0.6);
      this.tweens.add({
        targets: ember,
        y: 95,
        alpha: 0.1,
        yoyo: true,
        repeat: -1,
        duration: 900 + i * 100,
      });
    }
  }
}

import { GameScene } from "../../../game-engine/Scene";
export class GoldenScene extends GameScene {
  constructor() {
    super("golden-god");
  }
  create() {
    super.create();
    const sigil = this.add
      .text(450, 112, "◆ ◆ ◆", { fontSize: "15px", color: "#d5b16b" })
      .setOrigin(0.5);
    this.tweens.add({
      targets: sigil,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 1800,
    });
  }
}

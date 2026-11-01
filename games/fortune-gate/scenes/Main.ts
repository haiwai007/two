import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("fortune-gate");
  }
  create() {
    super.create();
    const rune = this.add.text(90, 82, "金", {
      fontFamily: "serif",
      fontSize: "27px",
      color: "#b48e52",
    });
    this.tweens.add({
      targets: rune,
      alpha: 0.2,
      scale: 1.2,
      yoyo: true,
      repeat: -1,
      duration: 1890,
    });
  }
}

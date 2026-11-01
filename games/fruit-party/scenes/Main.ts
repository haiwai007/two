import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("fruit-party");
  }
  create() {
    super.create();
    const rune = this.add.text(75, 82, "橙", {
      fontFamily: "serif",
      fontSize: "27px",
      color: "#b67c50",
    });
    this.tweens.add({
      targets: rune,
      alpha: 0.2,
      scale: 1.2,
      yoyo: true,
      repeat: -1,
      duration: 1710,
    });
  }
}

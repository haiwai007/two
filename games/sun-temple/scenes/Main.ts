import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("sun-temple");
  }
  create() {
    super.create();
    const rune = this.add.text(85, 82, "霞", {
      fontFamily: "serif",
      fontSize: "27px",
      color: "#b68f47",
    });
    this.tweens.add({
      targets: rune,
      alpha: 0.2,
      scale: 1.2,
      yoyo: true,
      repeat: -1,
      duration: 1830,
    });
  }
}

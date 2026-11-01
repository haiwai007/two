import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("journey-west");
  }
  create() {
    super.create();
    const rune = this.add.text(70, 82, "山", {
      fontFamily: "serif",
      fontSize: "27px",
      color: "#cc7a44",
    });
    this.tweens.add({
      targets: rune,
      alpha: 0.2,
      scale: 1.2,
      yoyo: true,
      repeat: -1,
      duration: 1650,
    });
  }
}

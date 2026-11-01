import { GameScene } from "../../../game-engine/Scene";
export class Main extends GameScene {
  constructor() {
    super("future-world");
  }
  create() {
    super.create();
    const rune = this.add.text(80, 82, "芯", {
      fontFamily: "serif",
      fontSize: "27px",
      color: "#447f9c",
    });
    this.tweens.add({
      targets: rune,
      alpha: 0.2,
      scale: 1.2,
      yoyo: true,
      repeat: -1,
      duration: 1770,
    });
  }
}

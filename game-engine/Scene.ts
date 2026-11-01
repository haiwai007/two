import * as Phaser from "phaser";
import type { Round } from "./rules";
const sets: Record<string, string[]> = {
  "golden-god": ["金", "玉", "福", "禄", "寿", "宝", "財", "神"],
  "dragon-world": ["青", "赤", "白", "玄", "玉", "珠", "金", "龍", "✦", "◎"],
  "phoenix-legend": ["◆", "✦", "●", "⬟", "❖", "♥", "✿"],
};
const palettes: Record<string, number[]> = {
  "golden-god": [
    0xf7cf73, 0x74c7aa, 0xe68669, 0xcca7ed, 0xc2d98b, 0xe7af5c, 0xf2d6a1,
    0xffedb4,
  ],
  "dragon-world": [
    0x6fcbb4, 0xe67d6a, 0xdce6ff, 0x819cdb, 0x8cd6c0, 0xe5c16c, 0xf2d38a,
    0xd99c68, 0xe4b8ff, 0xc2efff,
  ],
  "phoenix-legend": [
    0xf28ab1, 0x9d9aef, 0x69c7de, 0xe7ba60, 0x80d2a5, 0xe57780, 0xc39ce6,
  ],
};
export class GameScene extends Phaser.Scene {
  private cells: Phaser.GameObjects.Text[] = [];
  private tiles: Phaser.GameObjects.Rectangle[] = [];
  private cols = 3;
  private rows = 3;
  private gameId = "golden-god";
  private spinning = false;
  private tick?: Phaser.Time.TimerEvent;
  private result?: Round;
  constructor(id: string) {
    super("Original");
    this.gameId = id;
    this.cols = id === "golden-god" ? 3 : id === "dragon-world" ? 5 : 6;
    this.rows = id === "phoenix-legend" ? 5 : 3;
  }
  preload() {
    this.load.image("theme-background", "/api/assets/banner-" + this.gameId);
  }
  create() {
    const w = 900,
      h = 680;
    const color =
      this.gameId === "golden-god"
        ? 0x4a3520
        : this.gameId === "dragon-world"
          ? 0x143d45
          : 0x342447;
    this.cameras.main.setBackgroundColor(0x0e1320);
    if (this.textures.exists("theme-background")) {
      const bg = this.add.image(450, 340, "theme-background");
      const factor = Math.max(900 / bg.width, 680 / bg.height);
      bg.setScale(factor).setAlpha(0.27);
      this.add.rectangle(450, 340, 900, 680, 0x080d1b, 0.35);
    }
    this.add.circle(450, 280, 320, color, 0.7);
    this.add
      .circle(450, 280, 265, color, 0.55)
      .setStrokeStyle(1, 0xe3bc74, 0.2);
    this.add
      .text(
        450,
        42,
        this.gameId === "golden-god"
          ? "財 神 降 臨"
          : this.gameId === "dragon-world"
            ? "龍 騰 四 海"
            : "鳳 凰 涅 槃",
        { fontFamily: "serif", fontSize: "36px", color: "#e9cd94" },
      )
      .setOrigin(0.5);
    this.add
      .text(450, 88, "ORIGINAL EDITION  /  原创演示", {
        fontFamily: "sans-serif",
        fontSize: "12px",
        color: "#8f9ba8",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    const cellW = Math.min(170, 720 / this.cols),
      cellH = Math.min(126, 450 / this.rows),
      left = (w - this.cols * cellW) / 2,
      top = 145;
    this.add
      .rectangle(
        450,
        top + (this.rows * cellH) / 2,
        this.cols * cellW + 28,
        this.rows * cellH + 28,
        0x090e17,
      )
      .setStrokeStyle(2, 0xba9657, 0.7);
    for (let c = 0; c < this.cols; c++)
      for (let r = 0; r < this.rows; r++) {
        const x = left + c * cellW + cellW / 2,
          y = top + r * cellH + cellH / 2;
        this.tiles.push(
          this.add
            .rectangle(x, y, cellW - 8, cellH - 8, color, 0.6)
            .setStrokeStyle(1, 0xffffff, 0.06),
        );
        const symbol = (c + r) % sets[this.gameId].length;
        this.cells.push(
          this.add
            .text(x, y, sets[this.gameId][symbol], {
              fontSize: this.rows === 5 ? "48px" : "64px",
              fontFamily: "serif",
              color: "#e9cf98",
            })
            .setOrigin(0.5),
        );
      }
    this.add
      .text(450, 635, "结果由自有服务端生成 · 仅虚拟积分", {
        fontSize: "14px",
        color: "#7e8a9d",
      })
      .setOrigin(0.5);
    this.game.events.on("spin-start", this.start, this);
    this.game.events.on("spin-result", this.finish, this);
    this.game.events.on("spin-cancel", this.cancel, this);
    this.game.events.emit("scene-ready");
    this.events.once("shutdown", () => {
      this.game.events.off("spin-start", this.start, this);
      this.game.events.off("spin-result", this.finish, this);
      this.game.events.off("spin-cancel", this.cancel, this);
    });
  }
  start() {
    if (this.spinning) return;
    this.spinning = true;
    this.result = undefined;
    this.tiles.forEach((t) => t.setStrokeStyle(1, 0xffffff, 0.06));
    this.tick = this.time.addEvent({
      delay: 75,
      loop: true,
      callback: () => {
        this.cells.forEach((cell, i) => {
          const s =
            (Math.floor(this.time.now / 75) + i) % sets[this.gameId].length;
          cell.setText(sets[this.gameId][s]).setAlpha(0.55);
        });
      },
    });
  }
  cancel() {
    this.tick?.remove();
    this.spinning = false;
    this.cells.forEach((c) => c.setAlpha(1));
  }
  finish(round: Round) {
    this.result = round;
    this.time.delayedCall(650, () => {
      this.cancel();
      this.show(round.grid);
      const winning = new Set(round.wins.flat());
      for (const index of winning) {
        const tile = this.tiles[index];
        if (tile) {
          tile.setStrokeStyle(2, 0xf1cf82);
          this.tweens.add({
            targets: this.cells[index],
            scale: 1.15,
            yoyo: true,
            repeat: 2,
            duration: 180,
          });
        }
      }
      if (round.reward > 0) {
        for (let i = 0; i < 22; i++) {
          const coin = this.add.circle(
            80 + ((i * 37) % 740),
            100,
            5 + (i % 4),
            0xe4be74,
          );
          this.tweens.add({
            targets: coin,
            y: 640,
            alpha: 0,
            duration: 1000 + (i % 4) * 150,
            delay: i * 30,
            onComplete: () => coin.destroy(),
          });
        }
      }
      if (round.cascades?.length) {
        round.cascades.forEach((grid, i) =>
          this.time.delayedCall(750 * (i + 1), () => {
            this.tweens.add({
              targets: this.cells,
              alpha: 0.2,
              duration: 100,
              yoyo: true,
              onYoyo: () => this.show(grid),
            });
          }),
        );
      }
      this.time.delayedCall((round.cascades?.length ?? 0) * 750 + 500, () =>
        this.game.events.emit("round-finished"),
      );
    });
  }
  private show(grid: number[][]) {
    grid.forEach((col, c) =>
      col.forEach((s, r) => {
        const cell = this.cells[c * this.rows + r];
        cell
          .setText(sets[this.gameId][s])
          .setAlpha(1)
          .setColor(
            "#" + palettes[this.gameId][s].toString(16).padStart(6, "0"),
          );
      }),
    );
  }
}

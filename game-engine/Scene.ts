import * as Phaser from "phaser";
import { definition, type GameDefinition } from "./definitions";
import type { Round } from "./random";
export class GameScene extends Phaser.Scene {
  protected def: GameDefinition;
  private symbolAssets: Record<string, string> = {};
  private images: Phaser.GameObjects.Image[] = [];
  private cellWidth = 0;
  private cellHeight = 0;
  private fontSize = 0;
  private backgroundAsset?: string;
  useBackground(asset?: string, symbolAssets: Record<string, string> = {}) {
    this.backgroundAsset = asset;
    this.symbolAssets = symbolAssets;
    return this;
  }
  private cells: Phaser.GameObjects.Text[] = [];
  private tiles: Phaser.GameObjects.Rectangle[] = [];
  private stopped = new Set<number>();
  private timer?: Phaser.Time.TimerEvent;
  private spinning = false;
  private fast = false;
  private phase?: Phaser.GameObjects.Text;
  constructor(id: string) {
    super("Original");
    this.def = definition(id);
  }
  preload() {
    for (const [symbol, asset] of Object.entries(this.symbolAssets))
      this.load.image(
        "symbol-" + symbol,
        "/api/assets/" + encodeURIComponent(asset),
      );
    this.load.image(
      "theme-background",
      "/api/assets/" +
        encodeURIComponent(this.backgroundAsset ?? "banner-" + this.def.id),
    );
  }
  create() {
    const { columns, rows, color, name } = this.def;
    const tint = Phaser.Display.Color.HexStringToColor(color).color;
    this.cameras.main.setBackgroundColor(0x0e1320);
    if (this.textures.exists("theme-background")) {
      const bg = this.add.image(450, 340, "theme-background");
      bg.setScale(Math.max(900 / bg.width, 680 / bg.height)).setAlpha(0.35);
    }
    this.add.rectangle(450, 340, 900, 680, 0x080d1b, 0.48);
    this.add
      .text(450, 40, name, {
        fontFamily: "serif",
        fontSize: "36px",
        color: "#e9cd94",
      })
      .setOrigin(0.5);
    this.add
      .text(450, 83, "ORIGINAL EDITION  /  独立原创玩法", {
        fontFamily: "sans-serif",
        fontSize: "12px",
        color: "#9aa8bb",
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.phase = this.add
      .text(
        450,
        115,
        `${columns} × ${rows} · ${this.def.symbols.length}种图标`,
        { fontSize: "13px", color: "#b7a77e" },
      )
      .setOrigin(0.5);
    const cw = Math.min(190, 740 / columns),
      ch = Math.min(132, 450 / rows),
      left = (900 - columns * cw) / 2,
      top = 145;
    this.cellWidth = cw;
    this.cellHeight = ch;
    this.fontSize = Math.floor(Math.min(cw * 0.48, ch * 0.57));
    this.add
      .rectangle(
        450,
        top + (rows * ch) / 2,
        columns * cw + 24,
        rows * ch + 24,
        0x090e17,
        0.82,
      )
      .setStrokeStyle(2, tint, 0.8);
    for (let c = 0; c < columns; c++)
      for (let r = 0; r < rows; r++) {
        const x = left + c * cw + cw / 2,
          y = top + r * ch + ch / 2;
        this.tiles.push(
          this.add
            .rectangle(x, y, cw - 7, ch - 7, tint, 0.2)
            .setStrokeStyle(1, 0xffffff, 0.09),
        );
        this.cells.push(
          this.add
            .text(x, y, this.def.symbols[(c + r) % this.def.symbols.length], {
              fontSize: Math.floor(Math.min(cw * 0.48, ch * 0.57)) + "px",
              fontFamily: "serif",
              color: "#e7d3aa",
              shadow: {
                offsetX: 0,
                offsetY: 3,
                color: "#000000",
                blur: 5,
                fill: true,
              },
            })
            .setOrigin(0.5),
        );
      }
    if (Object.keys(this.symbolAssets).length) {
      this.images = this.cells.map((cell) =>
        this.add.image(cell.x, cell.y, "__DEFAULT").setVisible(false),
      );
      this.paint(
        Array.from({ length: columns }, (_, c) =>
          Array.from(
            { length: rows },
            (_, r) => (c + r) % this.def.symbols.length,
          ),
        ),
      );
    }
    this.game.canvas.dataset.symbolTextures = String(
      Object.keys(this.symbolAssets).filter((symbol) =>
        this.textures.exists("symbol-" + symbol),
      ).length,
    );
    this.add
      .text(450, 635, "服务端生成与验证 · 仅虚拟积分 · 原创规则非原版复刻", {
        fontSize: "13px",
        color: "#8b98af",
      })
      .setOrigin(0.5);
    this.game.events.on("spin-start", this.start, this);
    this.game.events.on("spin-result", this.finish, this);
    this.game.events.on("spin-cancel", this.cancel, this);
    this.game.events.on("animation-fast", this.setFast, this);
    this.game.events.on("animation-stop", this.requestStop, this);
    this.events.once("shutdown", () => {
      for (const [event, fn] of [
        ["spin-start", this.start],
        ["spin-result", this.finish],
        ["spin-cancel", this.cancel],
        ["animation-fast", this.setFast],
        ["animation-stop", this.requestStop],
      ] as const)
        this.game.events.off(event, fn, this);
    });
    this.game.events.emit("scene-ready");
  }
  private setFast(value: boolean) {
    this.fast = value;
  }
  private requestStop() {
    this.tweens.timeScale = 3;
    this.time.timeScale = 3;
  }
  start() {
    if (this.spinning) return;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.spinning = true;
    this.stopped.clear();
    this.tiles.forEach((t) => t.setStrokeStyle(1, 0xffffff, 0.09));
    this.phase?.setText("等待自有服务端结算…");
    this.timer = this.time.addEvent({
      delay: this.fast ? 35 : this.def.speed,
      loop: true,
      callback: () =>
        this.cells.forEach((cell, i) => {
          if (this.stopped.has(Math.floor(i / this.def.rows))) return;
          this.paintSymbol(
            i,
            (Math.floor(this.time.now / 50) + i) % this.def.symbols.length,
            0.45,
          );
        }),
    });
  }
  cancel() {
    this.timer?.remove();
    this.spinning = false;
    this.cells.forEach((c) => c.setAlpha(1));
  }
  private paintSymbol(index: number, symbol: number, alpha = 1) {
    const cell = this.cells[index],
      image = this.images[index];
    if (!cell) return;
    const color = Phaser.Display.Color.HSVToRGB(
      (symbol / this.def.symbols.length + 0.07) % 1,
      0.4,
      0.95,
    ).color;
    cell
      .setText(this.def.symbols[symbol] ?? "?")
      .setAlpha(alpha)
      .setScale(1)
      .setColor("#" + color.toString(16).padStart(6, "0"));
    const exists = image && this.textures.exists("symbol-" + symbol);
    if (image) {
      image.setVisible(!!exists);
      if (exists) {
        image.setTexture("symbol-" + symbol).setAlpha(alpha);
        const scale = Math.min(
          (this.cellWidth - 22) / image.width,
          (this.cellHeight - 38) / image.height,
        );
        image.setScale(scale);
      }
    }
    cell.setFontSize(exists ? Math.min(14, this.fontSize) : this.fontSize);
    cell.setAlpha(exists ? 0.75 : alpha);
    cell.setY(this.tiles[index].y + (exists ? this.cellHeight / 2 - 10 : 0));
  }
  private paint(grid: number[][]) {
    grid.forEach((col, c) =>
      col.forEach((symbol, r) =>
        this.paintSymbol(c * this.def.rows + r, symbol),
      ),
    );
  }
  private highlight(wins: number[][]) {
    this.tiles.forEach((t) => t.setStrokeStyle(1, 0xffffff, 0.09));
    for (const n of new Set(wins.flat()))
      if (this.tiles[n]) {
        this.tiles[n].setStrokeStyle(2, 0xf0cc7a);
        this.tweens.add({
          targets: this.cells[n],
          scale: 1.14,
          duration: this.fast ? 70 : 160,
          yoyo: true,
          repeat: 1,
        });
      }
  }
  finish(result: Round) {
    const interval = this.fast ? 35 : 105;
    for (let c = 0; c < this.def.columns; c++)
      this.time.delayedCall(200 + c * interval, () => {
        this.stopped.add(c);
        const col = result.grid[c];
        col.forEach((symbol, r) =>
          this.paintSymbol(c * this.def.rows + r, symbol),
        );
        this.game.events.emit("reel-stopped", c);
      });
    this.time.delayedCall(250 + this.def.columns * interval, () => {
      this.cancel();
      this.paint(result.grid);
      this.highlight(result.wins);
      this.phase?.setText(result.feature);
      const steps =
        result.steps ??
        result.cascades?.map((grid, i) => ({
          grid,
          wins: [],
          reward: 0,
          label: `连消补充 ${i + 1}`,
        })) ??
        [];
      const delay = this.fast ? 230 : 650;
      steps.forEach((step, i) =>
        this.time.delayedCall(delay * (i + 1), () => {
          this.phase?.setText(step.label);
          this.tweens.add({
            targets: this.cells,
            alpha: 0.1,
            duration: 100,
            yoyo: true,
            onYoyo: () => {
              this.paint(step.grid);
              this.highlight(step.wins);
            },
          });
          this.game.events.emit("bonus-stage", step.label);
        }),
      );
      this.time.delayedCall(delay * steps.length + 400, () => {
        if (result.reward > 0)
          for (let i = 0; i < 18; i++) {
            const coin = this.add.circle(
              100 + ((i * 41) % 700),
              110,
              5 + (i % 3),
              0xe4be74,
            );
            this.tweens.add({
              targets: coin,
              y: 620,
              alpha: 0,
              duration: 800 + i * 22,
              onComplete: () => coin.destroy(),
            });
          }
        this.phase?.setText(result.feature);
        this.time.timeScale = 1;
        this.tweens.timeScale = 1;
        this.game.events.emit("round-finished");
      });
    });
  }
}

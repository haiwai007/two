import * as Phaser from "phaser";
import { definition, type GameDefinition } from "./definitions";
import type { Round } from "./random";

type Slot = { image: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text };
type Step = NonNullable<Round["steps"]>[number];
const GOLD = 0xf3c969;

export class GameScene extends Phaser.Scene {
  protected def: GameDefinition;
  private symbolAssets: Record<string, string> = {};
  private backgroundAsset?: string;
  private cw = 0;
  private ch = 0;
  private left = 0;
  private top = 0;
  private reels: Slot[][] = [];
  private offsets: number[] = [];
  private spinningReels = new Set<number>();
  private glows: Phaser.GameObjects.Rectangle[] = [];
  private spinning = false;
  private fast = false;
  private token = 0;
  private phase?: Phaser.GameObjects.Text;
  private winText?: Phaser.GameObjects.Text;
  private badge?: Phaser.GameObjects.Container;
  private shown = 0;
  useBackground(asset?: string, symbolAssets: Record<string, string> = {}) {
    this.backgroundAsset = asset;
    this.symbolAssets = symbolAssets;
    return this;
  }
  constructor(id: string) {
    super("Original");
    this.def = definition(id);
  }
  private get scatter() {
    return this.def.symbols.length;
  }
  preload() {
    for (let i = 0; i <= this.scatter; i++) {
      const asset = Object.hasOwn(this.symbolAssets, String(i))
        ? this.symbolAssets[String(i)]
        : undefined;
      this.load.image(
        "symbol-" + i,
        asset
          ? "/api/assets/" + encodeURIComponent(asset)
          : i === this.scatter
            ? "/symbols/scatter.webp"
            : `/symbols/${this.def.id}/${i}.webp`,
      );
    }
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
      bg.setScale(Math.max(900 / bg.width, 680 / bg.height)).setAlpha(0.4);
    }
    this.add.rectangle(450, 340, 900, 680, 0x080d1b, 0.45);
    this.add
      .text(450, 38, name, {
        fontFamily: "serif",
        fontSize: "36px",
        color: "#f3d79a",
        stroke: "#3a2508",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.add
      .text(450, 80, "ORIGINAL EDITION  /  独立原创玩法", {
        fontFamily: "sans-serif",
        fontSize: "12px",
        color: "#9aa8bb",
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.phase = this.add
      .text(450, 112, `${columns} × ${rows} · 3个夺宝触发免费旋转`, {
        fontSize: "14px",
        color: "#d8c38e",
      })
      .setOrigin(0.5);
    const cw = Math.min(170, 740 / columns),
      ch = Math.min(132, 440 / rows);
    this.cw = cw;
    this.ch = ch;
    this.left = (900 - columns * cw) / 2;
    this.top = 140;
    const width = columns * cw,
      height = rows * ch,
      frame = this.add.graphics();
    frame.fillStyle(0x000000, 0.35).fillRoundedRect(this.left - 18, this.top - 12, width + 36, height + 36, 22);
    frame.fillStyle(0x0a1020, 0.92).fillRoundedRect(this.left - 14, this.top - 14, width + 28, height + 28, 20);
    frame.lineStyle(3, tint, 0.95).strokeRoundedRect(this.left - 14, this.top - 14, width + 28, height + 28, 20);
    frame.lineStyle(1, GOLD, 0.35).strokeRoundedRect(this.left - 8, this.top - 8, width + 16, height + 16, 16);
    for (let c = 0; c < columns; c++)
      for (let r = 0; r < rows; r++)
        frame
          .fillStyle(tint, 0.14)
          .fillRoundedRect(this.left + c * cw + 3, this.top + r * ch + 3, cw - 6, ch - 6, 12);
    for (let c = 0; c < columns; c++)
      for (let r = 0; r < rows; r++) {
        const { x, y } = this.center(c * rows + r);
        this.glows.push(
          this.add
            .rectangle(x, y, cw - 6, ch - 6, GOLD, 0)
            .setStrokeStyle(3, GOLD, 0)
            .setBlendMode(Phaser.BlendModes.ADD),
        );
      }
    const mask = this.make.graphics({}, false);
    mask.fillStyle(0xffffff).fillRect(this.left, this.top, width, height);
    const geometry = mask.createGeometryMask();
    for (let c = 0; c < columns; c++) {
      const reel: Slot[] = [];
      for (let r = -1; r < rows; r++) {
        const x = this.left + c * cw + cw / 2,
          y = this.top + r * ch + ch / 2;
        const image = this.add.image(x, y, "__DEFAULT").setMask(geometry);
        const text = this.add
          .text(x, y, "", {
            fontSize: Math.floor(Math.min(cw * 0.48, ch * 0.57)) + "px",
            fontFamily: "serif",
            color: "#e7d3aa",
            shadow: { offsetX: 0, offsetY: 3, color: "#000", blur: 5, fill: true },
          })
          .setOrigin(0.5)
          .setMask(geometry);
        reel.push({ image, text });
      }
      this.reels.push(reel);
      this.offsets.push(0);
    }
    this.paint(
      Array.from({ length: columns }, (_, c) =>
        Array.from({ length: rows }, (_, r) => (c + r) % this.def.symbols.length),
      ),
    );
    this.game.canvas.dataset.symbolTextures = String(
      Object.keys(this.symbolAssets).filter((symbol) =>
        this.textures.exists("symbol-" + symbol),
      ).length,
    );
    this.winText = this.add
      .text(450, this.top + height + 44, "", {
        fontFamily: "sans-serif",
        fontSize: "30px",
        fontStyle: "bold",
        color: "#ffe08a",
        stroke: "#5a3300",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(450, 662, "服务端生成与验证 · 仅虚拟积分 · 原创规则非原版复刻", {
        fontSize: "12px",
        color: "#8b98af",
      })
      .setOrigin(0.5);
    this.game.events.on("spin-start", this.start, this);
    this.game.events.on("spin-result", this.finish, this);
    this.game.events.on("spin-cancel", this.cancel, this);
    this.game.events.on("animation-fast", this.setFast, this);
    this.game.events.on("animation-stop", this.requestStop, this);
    this.events.once("shutdown", () => {
      this.token++;
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
  private center(index: number) {
    const rows = this.def.rows,
      c = Math.floor(index / rows),
      r = index % rows;
    return {
      x: this.left + c * this.cw + this.cw / 2,
      y: this.top + r * this.ch + this.ch / 2,
    };
  }
  private slot(index: number) {
    return this.reels[Math.floor(index / this.def.rows)]?.[(index % this.def.rows) + 1];
  }
  private setSymbol(slot: Slot, symbol: number, alpha = 1) {
    const key = "symbol-" + symbol,
      exists = this.textures.exists(key);
    slot.image.setVisible(exists).setAlpha(alpha).setAngle(0);
    if (exists) {
      slot.image.setTexture(key);
      slot.image.setScale(
        Math.min((this.cw - 14) / slot.image.width, (this.ch - 12) / slot.image.height),
      );
    }
    const glyph = symbol === this.scatter ? "夺宝" : (this.def.symbols[symbol] ?? "?");
    const color = Phaser.Display.Color.HSVToRGB(
      (symbol / (this.scatter + 1) + 0.07) % 1,
      0.4,
      0.95,
    ).color;
    slot.text
      .setVisible(!exists)
      .setText(glyph)
      .setAlpha(alpha)
      .setScale(1)
      .setColor("#" + color.toString(16).padStart(6, "0"));
    slot.image.setData("symbol", symbol);
  }
  private placeReel(c: number, offset: number) {
    this.offsets[c] = offset;
    this.reels[c].forEach((slot, i) => {
      const y = this.top + (i - 1) * this.ch + this.ch / 2 + offset;
      slot.image.setY(y);
      slot.text.setY(y);
    });
  }
  private paint(grid: number[][], alpha = 1) {
    grid.forEach((col, c) => {
      this.placeReel(c, 0);
      col.forEach((symbol, r) => this.setSymbol(this.reels[c][r + 1], symbol, alpha));
      this.reels[c][0].image.setScale(this.reels[c][1].image.scale);
    });
  }
  private randomSymbol() {
    return Math.floor(Math.random() * this.def.symbols.length);
  }
  update(_time: number, delta: number) {
    if (!this.spinningReels.size) return;
    const speed = this.ch * (this.fast ? 0.03 : 0.02) * Math.min(delta, 50);
    for (const c of this.spinningReels) {
      let offset = this.offsets[c] + speed;
      const reel = this.reels[c];
      while (offset >= this.ch) {
        offset -= this.ch;
        for (let i = reel.length - 1; i > 0; i--)
          this.setSymbol(reel[i], reel[i - 1].image.getData("symbol") ?? 0, 0.85);
        this.setSymbol(reel[0], this.randomSymbol(), 0.85);
      }
      this.placeReel(c, offset);
    }
  }
  private setFast(value: boolean) {
    this.fast = value;
  }
  private requestStop() {
    this.tweens.timeScale = 3;
    this.time.timeScale = 3;
  }
  private wait(ms: number, token: number) {
    return new Promise<boolean>((resolve) =>
      this.time.delayedCall(ms, () => resolve(token === this.token)),
    );
  }
  private clearHighlight() {
    this.tweens.killTweensOf(this.glows);
    this.glows.forEach((g) => g.setFillStyle(GOLD, 0).setStrokeStyle(3, GOLD, 0));
    for (const reel of this.reels)
      for (const slot of reel) {
        this.tweens.killTweensOf([slot.image, slot.text]);
        slot.image.setAlpha(1).setAngle(0);
        slot.text.setAlpha(1).setScale(1);
      }
    this.paintBadge(1);
  }
  start() {
    if (this.spinning) return;
    this.token++;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.spinning = true;
    this.clearHighlight();
    this.shown = 0;
    this.winText?.setText("").setScale(1);
    this.phase?.setText("转轴旋转中…");
    for (let c = 0; c < this.def.columns; c++) {
      this.setSymbol(this.reels[c][0], this.randomSymbol(), 0.85);
      this.spinningReels.add(c);
    }
  }
  cancel() {
    this.token++;
    this.spinning = false;
    this.spinningReels.clear();
    for (let c = 0; c < this.def.columns; c++) this.placeReel(c, 0);
    this.reels.flat().forEach((s) => s.image.setAlpha(1));
  }
  private async stopReels(grid: number[][], token: number, minimum: number) {
    const interval = this.fast ? 60 : 170;
    if (!(await this.wait(minimum, token))) return false;
    for (let c = 0; c < this.def.columns; c++) {
      if (c && !(await this.wait(interval, token))) return false;
      this.spinningReels.delete(c);
      grid[c].forEach((symbol, r) => this.setSymbol(this.reels[c][r + 1], symbol));
      this.placeReel(c, -this.ch * 0.35);
      const state = { offset: -this.ch * 0.35 };
      this.tweens.add({
        targets: state,
        offset: 0,
        duration: this.fast ? 120 : 260,
        ease: "Back.easeOut",
        onUpdate: () => this.placeReel(c, state.offset),
      });
      this.game.events.emit("reel-stopped", c);
    }
    return this.wait(this.fast ? 130 : 280, token);
  }
  private highlight(wins: number[][]) {
    const winning = new Set(wins.flat());
    if (!winning.size) return;
    for (let n = 0; n < this.def.columns * this.def.rows; n++) {
      const slot = this.slot(n);
      if (!slot) continue;
      if (!winning.has(n)) {
        slot.image.setAlpha(0.4);
        slot.text.setAlpha(0.4);
        continue;
      }
      const glow = this.glows[n];
      glow.setFillStyle(GOLD, 0.18).setStrokeStyle(3, GOLD, 1);
      this.tweens.add({
        targets: glow,
        fillAlpha: 0.04,
        duration: this.fast ? 160 : 360,
        yoyo: true,
        repeat: -1,
      });
      const base = slot.image.scale;
      this.tweens.add({
        targets: slot.image,
        scale: base * 1.15,
        duration: this.fast ? 90 : 200,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeInOut",
      });
      this.tweens.add({ targets: slot.text, scale: 1.15, duration: 200, yoyo: true, repeat: 2 });
    }
  }
  private pulseScatters(cells: number[]) {
    for (const n of cells) {
      const slot = this.slot(n);
      if (!slot) continue;
      const base = slot.image.scale;
      this.glows[n].setFillStyle(0xff4fd8, 0.22).setStrokeStyle(3, 0xff7be5, 1);
      this.tweens.add({
        targets: slot.image,
        scale: base * 1.25,
        angle: { from: -8, to: 8 },
        duration: 180,
        yoyo: true,
        repeat: 3,
      });
    }
  }
  private countUp(to: number, duration: number) {
    if (!this.winText || to <= this.shown) return;
    const state = { value: this.shown };
    this.shown = to;
    this.tweens.add({
      targets: state,
      value: to,
      duration,
      ease: "Cubic.easeOut",
      onUpdate: () => this.winText?.setText("赢得 " + Math.floor(state.value).toLocaleString()),
      onComplete: () => this.winText?.setText("赢得 " + to.toLocaleString()),
    });
    this.tweens.add({ targets: this.winText, scale: 1.18, duration: 140, yoyo: true });
  }
  private paintBadge(multiplier: number) {
    this.badge?.destroy();
    this.badge = undefined;
    if (multiplier <= 1) return;
    const x = this.left + this.def.columns * this.cw + 6,
      y = this.top - 10;
    const disc = this.add.circle(0, 0, 30, 0xb3261e).setStrokeStyle(3, GOLD);
    const label = this.add
      .text(0, 0, "×" + multiplier, { fontSize: "24px", fontStyle: "bold", color: "#fff1c1" })
      .setOrigin(0.5);
    this.badge = this.add.container(x, y, [disc, label]).setScale(0);
    this.tweens.add({ targets: this.badge, scale: 1, duration: 260, ease: "Back.easeOut" });
  }
  private async cascade(previous: number[][], step: Step, token: number) {
    const removed = previous.flat().map((n) => this.slot(n)).filter(Boolean) as Slot[];
    this.tweens.add({
      targets: removed.flatMap((s) => [s.image, s.text]),
      alpha: 0,
      scale: "*=1.4",
      duration: this.fast ? 90 : 200,
    });
    if (!(await this.wait(this.fast ? 100 : 220, token))) return false;
    this.clearHighlight();
    step.grid.forEach((col, c) => {
      col.forEach((symbol, r) => {
        const slot = this.reels[c][r + 1],
          y = this.top + r * this.ch + this.ch / 2;
        this.setSymbol(slot, symbol);
        slot.image.setY(y - this.ch * (this.def.rows - r));
        slot.text.setY(slot.image.y);
        this.tweens.add({
          targets: [slot.image, slot.text],
          y,
          duration: this.fast ? 160 : 340,
          delay: (this.def.rows - r) * (this.fast ? 15 : 35),
          ease: "Bounce.easeOut",
        });
      });
    });
    return this.wait(this.fast ? 220 : 480, token);
  }
  private async banner(title: string, subtitle: string, color: number, token: number, ms: number) {
    const shade = this.add.rectangle(450, 340, 900, 680, 0x000000, 0.55).setAlpha(0);
    const ribbon = this.add.rectangle(450, 330, 900, 150, color, 0.85).setScale(1, 0);
    const head = this.add
      .text(450, 312, title, {
        fontFamily: "serif",
        fontSize: "56px",
        fontStyle: "bold",
        color: "#fff3c4",
        stroke: "#4a2600",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScale(0);
    const sub = this.add
      .text(450, 368, subtitle, { fontSize: "26px", fontStyle: "bold", color: "#ffe08a", stroke: "#3a1d00", strokeThickness: 5 })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 160 });
    this.tweens.add({ targets: ribbon, scaleY: 1, duration: 220, ease: "Back.easeOut" });
    this.tweens.add({ targets: head, scale: 1, duration: 380, ease: "Back.easeOut", delay: 80 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 240, delay: 260 });
    this.coins(26);
    const alive = await this.wait(ms, token);
    this.tweens.add({
      targets: [shade, ribbon, head, sub],
      alpha: 0,
      duration: 180,
      onComplete: () => [shade, ribbon, head, sub].forEach((o) => o.destroy()),
    });
    return alive;
  }
  private coins(count: number) {
    for (let i = 0; i < count; i++) {
      const coin = this.add
        .ellipse(450 + (Math.random() - 0.5) * 120, 330, 18, 18, 0xf5c542)
        .setStrokeStyle(2, 0xa66d00);
      this.tweens.add({
        targets: coin,
        x: coin.x + (Math.random() - 0.5) * 820,
        y: 700,
        scaleX: { from: 1, to: 0.2 },
        duration: 900 + Math.random() * 700,
        ease: "Quad.easeIn",
        onComplete: () => coin.destroy(),
      });
    }
  }
  finish(result: Round) {
    void this.play(result);
  }
  private async play(result: Round) {
    const token = this.token,
      stake = result.stake ?? 10;
    const steps: Step[] =
      result.steps ??
      result.cascades?.map((grid, i) => ({ grid, wins: [], reward: 0, label: `连消补充 ${i + 1}` })) ??
      [];
    if (!(await this.stopReels(result.grid, token, this.fast ? 120 : 380))) return;
    this.spinning = false;
    this.spinningReels.clear();
    const free = result.freeSpins?.spins ?? 0,
      freeStart = steps.length - free,
      baseReward = Math.max(0, result.reward - steps.reduce((sum, s) => sum + s.reward, 0));
    this.highlight(result.wins);
    if (result.multiplier > 1 && !free) this.paintBadge(result.multiplier);
    this.countUp(baseReward, this.fast ? 250 : 700);
    this.phase?.setText(result.feature);
    if ((result.scatters?.length ?? 0) > 0) this.pulseScatters(result.scatters!);
    let previous = result.wins;
    for (const [i, step] of steps.entries()) {
      if (!(await this.wait(this.fast ? 260 : 720, token))) return;
      this.game.events.emit("bonus-stage", step.label);
      this.phase?.setText(step.label);
      if (i >= freeStart) {
        if (i === freeStart) {
          this.clearHighlight();
          this.pulseScatters(result.scatters ?? []);
          if (!(await this.banner("免费旋转", `${free} 次 · 倍数逐次递增`, 0x7a1f8f, token, this.fast ? 700 : 1500)))
            return;
        }
        this.clearHighlight();
        this.paintBadge(i - freeStart + 1);
        for (let c = 0; c < this.def.columns; c++) this.spinningReels.add(c);
        if (!(await this.stopReels(step.grid, token, this.fast ? 120 : 320))) return;
        this.spinningReels.clear();
        this.paintBadge(i - freeStart + 1);
      } else if (!(await this.cascade(previous, step, token))) return;
      this.highlight(step.wins);
      this.countUp(this.shown + step.reward, this.fast ? 220 : 520);
      previous = step.wins;
    }
    if (!(await this.wait(this.fast ? 200 : 520, token))) return;
    this.countUp(result.reward, 200);
    const ratio = result.reward / stake;
    if (ratio >= 10) {
      const [title, color] =
        ratio >= 50 ? ["超级大奖", 0xa01717] : ratio >= 25 ? ["巨奖", 0xb3541e] : ["大奖", 0x8a6512];
      if (!(await this.banner(title, "+" + result.reward.toLocaleString(), color, token, this.fast ? 900 : 2200)))
        return;
    } else if (result.reward > 0) this.coins(14);
    this.phase?.setText(result.feature);
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.game.events.emit("round-finished");
  }
}

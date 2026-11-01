export default {
  id: "golden-god",
  name: "黄金财神",
  columns: 3,
  rows: 3,
  symbols: ["金", "玉", "福", "禄", "寿", "宝", "財", "神"],
  color: "#c99a38",
  rules:
    "原创演示规则：3×3五条完整连线；财神7为Wild；图标倍率2/3/4/5/7/10/15/20，逐线累加。",
  motif: "sigil",
  speed: 65,
  audio: {
    melody: [146.83, 174.61, 220.0, 293.66, 220.0, 174.61],
    wave: "sine",
    interval: 850,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

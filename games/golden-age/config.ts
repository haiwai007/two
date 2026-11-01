export default {
  id: "golden-age",
  name: "黄金时代",
  columns: 3,
  rows: 2,
  symbols: ["铜", "银", "金", "玉", "冠", "皇"],
  color: "#ac8244",
  rules:
    "原创演示规则：3×2两条完整横线；图标倍率2/3/5/8/12/20；初盘至少三皇冠5，将所有3–5改为5，免费重铸一次，原盘与重铸奖励相加，不再触发重铸。",
  motif: "rays",
  speed: 89,
  audio: {
    melody: [261.62, 311.12, 391.99, 523.24, 391.99, 311.12],
    wave: "triangle",
    interval: 1090,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

export default {
  id: "journey-west",
  name: "西游奇缘",
  columns: 5,
  rows: 4,
  symbols: ["山", "水", "云", "月", "杖", "经", "桃", "悟"],
  color: "#cc7a44",
  rules:
    "原创演示规则：5×4随机选起点，后续列路径每次上下移动一格或保持，边界截断；以首格图标为基准，后续Wild7可替代，连续三站起奖：积分×(站数−2)×(首图标序号+2)；四枚以上蟠桃6额外奖励积分×数量。",
  motif: "runes",
  speed: 65,
  audio: {
    melody: [195.99, 246.94, 293.66, 391.99, 293.66, 233.08],
    wave: "sine",
    interval: 850,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

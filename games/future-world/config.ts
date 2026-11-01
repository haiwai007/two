export default {
  id: "future-world",
  name: "未来世界",
  columns: 7,
  rows: 3,
  symbols: ["芯", "轨", "城", "光", "舰", "码", "能", "脉"],
  color: "#447f9c",
  rules:
    "原创演示规则：7×3中央中格为脉冲7时，将中央行第3–5格改为中央列上格图标；每行从左边和右边分别评估连续同色三枚起奖=积分×(连续数−2)×(图标序号+1)；两方向独立计奖。",
  motif: "runes",
  speed: 89,
  audio: {
    melody: [195.99, 246.94, 293.66, 391.99, 293.66, 233.08],
    wave: "sine",
    interval: 1090,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

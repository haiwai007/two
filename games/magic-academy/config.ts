export default {
  id: "magic-academy",
  name: "魔法学院",
  columns: 4,
  rows: 6,
  symbols: ["风", "火", "水", "土", "光", "星"],
  color: "#725bb4",
  rules:
    "原创演示规则：4×6各列从上到下连续同色三枚起奖；奖励=积分×(图标序号+1)×(长度−2)；最长四枚时全局二倍，五或六枚时三倍。",
  motif: "wave",
  speed: 113,
  audio: {
    melody: [246.94, 311.12, 369.99, 493.88, 369.99, 293.66],
    wave: "sine",
    interval: 1330,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

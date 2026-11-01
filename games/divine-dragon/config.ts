export default {
  id: "divine-dragon",
  name: "神龙宝藏",
  columns: 4,
  rows: 4,
  symbols: ["珠", "鳞", "角", "云", "火", "金", "玉", "印"],
  color: "#61945c",
  rules:
    "原创演示规则：4×4六条完整连线；四个外角中两枚以上龙印7，将中央四格变Wild7；每条完整线奖励=积分×(首个非Wild图标序号+2)，全Wild按7计算。",
  motif: "wave",
  speed: 101,
  audio: {
    melody: [174.61, 220.0, 261.62, 349.22, 261.62, 207.65],
    wave: "sine",
    interval: 1210,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

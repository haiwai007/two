export default {
  id: "candy-world",
  name: "糖果世界",
  columns: 6,
  rows: 5,
  symbols: ["糖", "果", "蜜", "巧", "甜", "星"],
  color: "#b65d8f",
  rules:
    "原创演示规则：6×5每行横向连续三枚同色成组，奖励=积分×(长度−2)×(图标序号+1)×波次；消除后剩余图标居中，两侧补充，最多三波。",
  motif: "sigil",
  speed: 89,
  audio: {
    melody: [146.83, 174.61, 220.0, 293.66, 220.0, 174.61],
    wave: "sine",
    interval: 1090,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

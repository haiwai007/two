export default {
  id: "lucky-star",
  name: "幸运之星",
  columns: 5,
  rows: 5,
  symbols: ["红", "蓝", "绿", "紫", "金", "月", "星"],
  color: "#7074b4",
  rules:
    "原创演示规则：5×5中心为星6时，八条射线逐步读取相邻星，遇到非星停止，每条奖励=积分×射线星数×(星数+1)；中心非星时，和中心同色的图标全盘至少六枚，奖励=积分×(数量−5)×(中心序号+1)。",
  motif: "orbit",
  speed: 101,
  audio: {
    melody: [155.56, 195.99, 233.08, 311.12, 233.08, 184.99],
    wave: "triangle",
    interval: 1210,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

export default {
  id: "phoenix-legend",
  name: "凤凰传奇",
  columns: 6,
  rows: 5,
  symbols: ["红", "紫", "蓝", "金", "绿", "心", "凤"],
  color: "#a14b9c",
  rules:
    "原创演示规则：6×5正交相邻五枚同色成群；奖励=积分×(群大小−4)×(图标序号+1)×轮次；重力补充，最多五次连消。",
  motif: "embers",
  speed: 89,
  audio: {
    melody: [164.81, 195.99, 246.94, 329.62, 246.94, 195.99],
    wave: "sine",
    interval: 1090,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

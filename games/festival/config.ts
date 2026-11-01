export default {
  id: "festival",
  name: "节日狂欢",
  columns: 5,
  rows: 3,
  symbols: ["灯", "鼓", "花", "礼", "星", "焰", "乐", "彩"],
  color: "#b56a52",
  rules:
    "原创演示规则：5×3至少三枚彩纸7进入庆典模式，仅边框普通同色四枚起奖=积分×(图标序号+1)×(数量−3)×2；否则只检查中间一行完整五连，奖励=积分×(图标序号+1)×5。",
  motif: "orbit",
  speed: 113,
  audio: {
    melody: [220.0, 277.18, 329.62, 439.99, 329.62, 261.62],
    wave: "triangle",
    interval: 1330,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

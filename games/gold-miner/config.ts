export default {
  id: "gold-miner",
  name: "黄金矿工",
  columns: 5,
  rows: 3,
  symbols: ["矿", "金", "钻", "石", "土", "灯", "镐", "车", "尘"],
  color: "#9e7d40",
  rules:
    "原创演示规则：5×3矿石0/1/2价值分别为1/2/3倍积分；初盘至少三矿触发两次不扣积分的重转，已得矿石锁定；最终至少六矿时收集全部价值，满15矿价值三倍；不会额外扣分或无限重触发。",
  motif: "embers",
  speed: 113,
  audio: {
    melody: [164.81, 195.99, 246.94, 329.62, 246.94, 195.99],
    wave: "sine",
    interval: 1330,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

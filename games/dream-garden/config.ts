export default {
  id: "dream-garden",
  name: "梦幻花园",
  columns: 5,
  rows: 5,
  symbols: ["玫", "兰", "莲", "菊", "茉", "葵", "水"],
  color: "#6c9067",
  rules:
    "原创演示规则：5×5随机季节激活棋盘一种奇偶格；活跃格中同花0–5至少四枚奖励=积分×(图标序号+1)×(数量−3)；获奖花中任一与水6正交相邻时该花奖励翻倍。",
  motif: "rays",
  speed: 101,
  audio: {
    melody: [184.99, 220.0, 277.18, 369.99, 277.18, 220.0],
    wave: "triangle",
    interval: 1210,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

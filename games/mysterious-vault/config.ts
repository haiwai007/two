export default {
  id: "mysterious-vault",
  name: "神秘宝库",
  columns: 3,
  rows: 3,
  symbols: ["〇", "一", "二", "三", "四", "五"],
  color: "#8e6999",
  rules:
    "原创演示规则：3×3每列是密码锁，(上格+下格)除以6的余数等于中格即开锁；每锁奖励=积分×(中格序号+1)；三锁全开再增加随机3–14倍积分。",
  motif: "embers",
  speed: 65,
  audio: {
    melody: [233.08, 277.18, 349.22, 466.16, 349.22, 277.18],
    wave: "sine",
    interval: 850,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

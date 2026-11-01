export default {
  id: "three-kingdoms",
  name: "三国霸业",
  columns: 5,
  rows: 3,
  symbols: ["魏", "蜀", "吴", "马", "弓", "剑", "鼓"],
  color: "#8d5d5d",
  rules:
    "原创演示规则：5×3每一行是一军；某图标在该行出现至少三次，奖励=积分×(图标序号+1)×(数量−2)；三行都获奖时总奖励三倍。",
  motif: "sigil",
  speed: 77,
  audio: {
    melody: [207.65, 246.94, 311.12, 415.3, 311.12, 246.94],
    wave: "sine",
    interval: 970,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

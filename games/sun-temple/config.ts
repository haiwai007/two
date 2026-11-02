export default {
  id: "sun-temple",
  name: "太阳神殿",
  columns: 5,
  rows: 5,
  symbols: ["霞", "云", "焰", "光", "日", "金", "阳"],
  color: "#b68f47",
  rules:
    "原创演示规则：5×5以中央图标为光源；内圈8格同色至少3枚、外圈16格至少5枚分别计奖；奖励=积分×(中心序号+1)×(同色数−门槛+1)×圈半径；两圈全部同色时总奖励三倍。",
  motif: "runes",
  speed: 101,
  audio: {
    melody: [277.18, 349.22, 415.3, 554.36, 415.3, 329.62],
    wave: "sine",
    interval: 1210,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

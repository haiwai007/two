export default {
  id: "fruit-party",
  name: "水果派对",
  columns: 6,
  rows: 4,
  symbols: ["橙", "柠", "桃", "葡", "瓜", "樱", "梨", "莓"],
  color: "#b67c50",
  rules:
    "原创演示规则：6×4全盘同类图标至少五枚计奖：积分×(数量−4)×(图标序号+1)；八类水果全部出现时另加两倍积分。",
  motif: "runes",
  speed: 77,
  audio: {
    melody: [277.18, 349.22, 415.3, 554.36, 415.3, 329.62],
    wave: "sine",
    interval: 970,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

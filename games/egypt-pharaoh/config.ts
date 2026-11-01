export default {
  id: "egypt-pharaoh",
  name: "埃及法老",
  columns: 5,
  rows: 3,
  symbols: ["杖", "猫", "鸟", "冠", "瓶", "金", "玉", "神", "甲"],
  color: "#a38949",
  rules:
    "原创演示规则：5×3三条金字塔路径；Wild7可替代，Scatter8不参与连线；每条奖励=积分×(图标序号+2)×2；三枚以上Scatter触发三次不扣积分的揭示，免费揭示图标为0–7，不再触发免费揭示；所有结果同一事务结算。",
  motif: "rays",
  speed: 113,
  audio: {
    melody: [184.99, 220.0, 277.18, 369.99, 277.18, 220.0],
    wave: "triangle",
    interval: 1330,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

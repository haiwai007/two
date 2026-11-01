export default {
  id: "dragon-legend",
  name: "龙之传说",
  columns: 5,
  rows: 4,
  symbols: ["珠", "角", "云", "火", "金", "玉", "鳞", "龙"],
  color: "#438d8a",
  rules:
    "原创演示规则：5×4原始某列有至少两龙7时，下一列全变Wild7，不连续传播新产生的Wild；从左连续三列起评估1024路；普通图标0–6独立计奖=向下取整(积分×路数×(图标序号+1)×(连续列数−2)/8)。",
  motif: "wave",
  speed: 77,
  audio: {
    melody: [246.94, 311.12, 369.99, 493.88, 369.99, 293.66],
    wave: "sine",
    interval: 970,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

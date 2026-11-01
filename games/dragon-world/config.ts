export default {
  id: "dragon-world",
  name: "龙腾四海",
  columns: 5,
  rows: 3,
  symbols: ["青", "赤", "白", "玄", "玉", "珠", "金", "龍", "星", "印"],
  color: "#3197a1",
  rules:
    "原创演示规则：5×3从左连续三列起算243路；Wild8代替普通图标0–7，每个普通图标单独评估；奖励=向下取整(积分×路数×图标倍率×(连续列数−2)/3)；图标倍率1/2/3/4/5/6/8/10；Scatter9至少三枚使本局奖励翻倍。",
  motif: "orbit",
  speed: 77,
  audio: {
    melody: [155.56, 195.99, 233.08, 311.12, 233.08, 184.99],
    wave: "triangle",
    interval: 970,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

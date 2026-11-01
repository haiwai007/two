export default {
  id: "gem-kingdom",
  name: "宝石王国",
  columns: 5,
  rows: 4,
  symbols: ["钻", "翠", "蓝", "红", "紫", "晶"],
  color: "#5d91af",
  rules:
    "原创演示规则：5×4每个同色2×2方块独立奖励积分×(图标序号+2)；重叠格数按所有方块格数减不同格数计算，每个重叠格额外奖励一倍积分。",
  motif: "rays",
  speed: 65,
  audio: {
    melody: [261.62, 311.12, 391.99, 523.24, 391.99, 311.12],
    wave: "triangle",
    interval: 850,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

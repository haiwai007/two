export default {
  id: "animal-kingdom",
  name: "动物王国",
  columns: 5,
  rows: 4,
  symbols: ["狮", "虎", "象", "鹰", "鹿", "狼"],
  color: "#818347",
  rules:
    "原创演示规则：5×4同类动物在一列中具有相邻纵向对即为栖地；同类动物至少三个连续栖地迁徙，奖励=积分×(图标序号+1)×(连续栖地数−2)×2。每列只取首个纵向对。",
  motif: "sigil",
  speed: 101,
  audio: {
    melody: [207.65, 246.94, 311.12, 415.3, 311.12, 246.94],
    wave: "sine",
    interval: 1210,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

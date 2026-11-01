export default {
  id: "western-myth",
  name: "西方神话",
  columns: 3,
  rows: 5,
  symbols: ["雷", "冠", "弓", "盾", "翼", "光", "神", "电"],
  color: "#6b6ab1",
  rules:
    "原创演示规则：3×5任一原始列有雷7时，将该列改成右邻列中间图标；若该参考也是雷则使用6；变换后检查六条三列斜线路径；每条奖励=积分×(图标序号+1)×2。",
  motif: "rays",
  speed: 77,
  audio: {
    melody: [184.99, 220.0, 277.18, 369.99, 277.18, 220.0],
    wave: "triangle",
    interval: 970,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

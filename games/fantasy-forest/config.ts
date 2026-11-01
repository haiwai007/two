export default {
  id: "fantasy-forest",
  name: "奇幻森林",
  columns: 5,
  rows: 5,
  symbols: ["叶", "蕨", "花", "木", "鹿", "泉", "树"],
  color: "#49926b",
  rules:
    "原创演示规则：5×5八方向连接同色六枚成群；奖励=积分×(群大小−5)×(图标序号+1)；包含任何外角的群奖励翻倍。",
  motif: "embers",
  speed: 101,
  audio: {
    melody: [233.08, 277.18, 349.22, 466.16, 349.22, 277.18],
    wave: "sine",
    interval: 1210,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

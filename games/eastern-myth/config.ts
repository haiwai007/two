export default {
  id: "eastern-myth",
  name: "东方神话",
  columns: 4,
  rows: 4,
  symbols: ["阴", "阳", "山", "海", "日", "月"],
  color: "#588b8a",
  rules:
    "原创演示规则：4×4与中心对称位置逐对比较，共八对；每对同色奖励=积分×(图标序号+1)；至少六对时全局二倍，八对时四倍。",
  motif: "wave",
  speed: 65,
  audio: {
    melody: [174.61, 220.0, 261.62, 349.22, 261.62, 207.65],
    wave: "sine",
    interval: 850,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

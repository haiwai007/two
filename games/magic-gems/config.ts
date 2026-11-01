export default {
  id: "magic-gems",
  name: "魔法宝石",
  columns: 4,
  rows: 4,
  symbols: ["红", "蓝", "绿", "紫", "白", "金"],
  color: "#648d88",
  rules:
    "原创演示规则：4×4中央四格顺时针旋转一次；旋转前后各独立评估正交同色四枚成群，奖励=积分×(群大小−3)×(图标序号+1)，两阶段相加，不再旋转。",
  motif: "sigil",
  speed: 113,
  audio: {
    melody: [146.83, 174.61, 220.0, 293.66, 220.0, 174.61],
    wave: "sine",
    interval: 1330,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

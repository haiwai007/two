export default {
  id: "fortune-gate",
  name: "财富之门",
  columns: 6,
  rows: 3,
  symbols: ["金", "银", "铜", "玉", "红", "蓝", "紫", "钥"],
  color: "#b48e52",
  rules:
    "原创演示规则：6×3外向内三组镜像双轴；每组对应的三行全部相同或有钥匙Wild7才开门；第1/2/3门奖励4/8/12倍积分；三门全开总基础奖励三倍；至少两门再加随机1–9倍积分。",
  motif: "runes",
  speed: 113,
  audio: {
    melody: [195.99, 246.94, 293.66, 391.99, 293.66, 233.08],
    wave: "sine",
    interval: 1330,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

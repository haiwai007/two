export default {
  id: "ace-legend",
  name: "王牌传奇",
  columns: 5,
  rows: 3,
  symbols: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"],
  color: "#994f60",
  rules:
    "原创演示规则：5×3只作为转轴点数符号，无发牌、下注选择或棋牌对局；每行五同/四同/三加二/三同/两对/一对倍率50/15/8/4/3/1；全盘至少三个A12，另加积分×A数量×2。",
  motif: "wave",
  speed: 89,
  audio: {
    melody: [174.61, 220.0, 261.62, 349.22, 261.62, 207.65],
    wave: "sine",
    interval: 1090,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

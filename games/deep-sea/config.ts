export default {
  id: "deep-sea",
  name: "深海秘境",
  columns: 4,
  rows: 6,
  symbols: ["贝", "珊", "鱼", "珠", "藻", "潮", "蓝", "泡"],
  color: "#426b9d",
  rules:
    "原创演示规则：4×6各列向上循环移1/2/3/4格；变换后每行从左同色连续三枚起奖=积分×(图标序号+1)×(长度−2)；初盘气泡7至少五枚，连线奖励二倍并另加积分×气泡数。",
  motif: "embers",
  speed: 77,
  audio: {
    melody: [164.81, 195.99, 246.94, 329.62, 246.94, 195.99],
    wave: "sine",
    interval: 970,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

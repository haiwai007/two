export default {
  id: "star-journey",
  name: "星辰之旅",
  columns: 7,
  rows: 3,
  symbols: ["船", "月", "日", "云", "轨", "光", "星"],
  color: "#6265ac",
  rules:
    "原创演示规则：7×3七点星图行号依次2/1/3/2/1/3/2；星图路径中连续三颗星光（光5或星6）起奖=积分×(长度−2)平方×3；七点全星另加20倍积分。",
  motif: "orbit",
  speed: 65,
  audio: {
    melody: [155.56, 195.99, 233.08, 311.12, 233.08, 184.99],
    wave: "triangle",
    interval: 850,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

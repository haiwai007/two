export default {
  id: "pirate-treasure",
  name: "海盗秘宝",
  columns: 4,
  rows: 5,
  symbols: ["帆", "锚", "币", "舵", "酒", "剑", "图", "钥"],
  color: "#4178a3",
  rules:
    "原创演示规则：4×5罗盘选航线，后续列上下移动一格或保持并环绕；路径中0–2图标属于宝藏，至少三个奖励=积分×数量×2；全盘至少三把钥匙7，额外奖励=积分×钥匙数量×随机1–6。",
  motif: "orbit",
  speed: 89,
  audio: {
    melody: [220.0, 277.18, 329.62, 439.99, 329.62, 261.62],
    wave: "triangle",
    interval: 1090,
  },
  version: "0.2.0",
  original: true,
  pendingOriginalRules: true,
} as const;

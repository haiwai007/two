export const MAX_POINT_MINOR = 9007199254740991;
export function pointMinor(value: unknown) {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw Object.assign(Error("积分最多支持两位小数"), { status: 400 });
  const amount = BigInt(match[2]) * 100n + BigInt((match[3] ?? "").padEnd(2, "0"));
  const result = (match[1] ? -1n : 1n) * amount;
  if (result > BigInt(MAX_POINT_MINOR) || result < -BigInt(MAX_POINT_MINOR)) throw Object.assign(Error("积分数值超出范围"), { status: 400 });
  return Number(result);
}
export function pointParts(minor: number) {
  if (!Number.isSafeInteger(minor) || minor < 0 || minor > MAX_POINT_MINOR) throw Object.assign(Error("积分余额无效"), { status: 400 });
  return { whole: Math.floor(minor / 100), fraction: minor % 100 };
}
export const formatPoints = (value: number) => value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

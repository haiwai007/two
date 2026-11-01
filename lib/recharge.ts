export const RECHARGE_KEY = "payment_usdt_trc20";
export type RechargeSettings = { enabled: boolean; autoApproval: boolean; address: string; qrAssetId: string | null; instructions: string; qrConfirmed: boolean; revision: number };
export const defaultRecharge: RechargeSettings = { enabled: false, autoApproval: false, address: "", qrAssetId: null, instructions: "", qrConfirmed: false, revision: 0 };
export function readRecharge(value?: string): RechargeSettings {
  if (!value) return { ...defaultRecharge };
  try {
    const data = JSON.parse(value);
    return {
      enabled: data.enabled === true,
      autoApproval: data.autoApproval === true,
      address: typeof data.address === "string" ? data.address.slice(0, 100) : "",
      qrAssetId: typeof data.qrAssetId === "string" ? data.qrAssetId.slice(0, 100) : null,
      instructions: typeof data.instructions === "string" ? data.instructions.slice(0, 1000) : "",
      qrConfirmed: data.qrConfirmed === true,
      revision: Number.isSafeInteger(data.revision) && data.revision >= 0 ? data.revision : 0,
    };
  } catch { return { ...defaultRecharge }; }
}
export async function validTronAddress(address: string) {
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) return false;
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let value = 0n;
  for (const c of address) value = value * 58n + BigInt(alphabet.indexOf(c));
  const bytes: number[] = [];
  while (value) { bytes.unshift(Number(value & 255n)); value >>= 8n; }
  if (bytes.length !== 25 || bytes[0] !== 65) return false;
  const first = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes.slice(0, 21)));
  const second = new Uint8Array(await crypto.subtle.digest("SHA-256", first));
  return bytes.slice(21).every((byte, i) => byte === second[i]);
}
export async function tronAddressHex(address: string) {
  if (!await validTronAddress(address)) throw Object.assign(Error("TRON地址无效"), {status:400});
  const alphabet="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let value=0n;for(const c of address)value=value*58n+BigInt(alphabet.indexOf(c));
  return value.toString(16).padStart(50,"0").slice(2,42);
}

export const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
export const USDT_CONTRACT_HEX = "a614f803b6fd780986a42c78ec9c7f77e6ded13c";
const TRANSFER = "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
type Log = { address?: string; topics?: string[]; data?: string };
type Receipt = { id?: string; blockNumber?: number; blockTimeStamp?: number; receipt?: { result?: string }; log?: Log[] };
type Transaction = { txID?: string; ret?: { contractRet?: string }[] };
function hex(value: unknown) { return typeof value === "string" ? value.toLowerCase().replace(/^0x/, "") : ""; }
export function confirmedUsdtTransfers(txId: string, transaction: Transaction, receipt: Receipt, solidBlockNumber: number) {
  if (!/^[0-9a-f]{64}$/.test(txId) || transaction.txID !== txId || receipt.id !== txId) throw Error("Transaction identity mismatch");
  if (!transaction.ret?.length || transaction.ret.some(ret => ret.contractRet !== "SUCCESS") || receipt.receipt?.result !== "SUCCESS") throw Error("Transaction did not execute successfully");
  if (!Number.isSafeInteger(receipt.blockNumber) || !Number.isSafeInteger(solidBlockNumber) || receipt.blockNumber! > solidBlockNumber || receipt.blockNumber! < 0) throw Error("Transaction is not confirmed in the solidified chain");
  if (!Number.isSafeInteger(receipt.blockTimeStamp) || receipt.blockTimeStamp! <= 0) throw Error("Invalid block timestamp");
  const transfers: { txId: string; logIndex: number; recipientHex: string; senderHex: string; amountMicro: string; blockNumber: number; blockTimestamp: number }[] = [];
  for (const [logIndex, log] of (receipt.log ?? []).entries()) {
    if (hex(log.address) !== USDT_CONTRACT_HEX || log.topics?.length !== 3 || hex(log.topics[0]) !== TRANSFER) continue;
    const from = hex(log.topics[1]), to = hex(log.topics[2]), data = hex(log.data);
    if (!/^[0-9a-f]{64}$/.test(from) || !/^[0-9a-f]{64}$/.test(to) || !/^[0-9a-f]{64}$/.test(data) || !from.startsWith("0".repeat(24)) || !to.startsWith("0".repeat(24))) continue;
    const amount = BigInt("0x" + data);
    if (amount <= 0n) continue;
    transfers.push({ txId, logIndex, recipientHex: to.slice(24), senderHex: from.slice(24), amountMicro: amount.toString(), blockNumber: receipt.blockNumber!, blockTimestamp: receipt.blockTimeStamp! });
  }
  return transfers;
}

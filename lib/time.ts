export function formatTimestamp(value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:/.test(value)
    ? value.replace(" ", "T") + "Z"
    : value;
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

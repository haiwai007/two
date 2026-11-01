export function canonicalLocation(
  input: string,
  host?: string | null,
): string | null {
  const url = new URL(input);
  if (
    url.hostname !== "www.h6688.win" &&
    host?.split(":")[0] !== "www.h6688.win"
  )
    return null;
  url.hostname = "h6688.win";
  url.protocol = "https:";
  url.port = "";
  return url.href;
}

import { getPlatformProxy } from "wrangler";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const manifest = JSON.parse(readFileSync("docs/assets-manifest.json", "utf8"));
const proxy = await getPlatformProxy({
  configPath: "wrangler.jsonc",
  persist: true,
  remoteBindings: false,
});
try {
  const statements = [];
  let count = 0;
  for (const asset of manifest.assets) {
    if (asset.status !== "generated") continue;
    const bytes = readFileSync(asset.path);
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
    const key = "original/" + hash + "/" + asset.filename;
    await proxy.env.BUCKET.put(key, bytes, {
      httpMetadata: { contentType: "image/png" },
    });
    statements.push(
      proxy.env.DB.prepare(
        "UPDATE game_assets SET storage_key=?,media_type=?,size=? WHERE id=?",
      ).bind(key, "image/png", bytes.length, asset.assetId),
    );
    count++;
  }
  await proxy.env.DB.batch(statements);
  const record = await proxy.env.DB.prepare(
    "SELECT COUNT(*) AS total FROM game_assets WHERE storage_key LIKE 'original/%'",
  ).first();
  console.log(
    JSON.stringify({
      uploaded: count,
      metadata: record.total,
      scope: "local R2/D1 only",
    }),
  );
} finally {
  await proxy.dispose();
}

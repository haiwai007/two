import { getPlatformProxy } from "wrangler";
import fs from "node:fs";
const data = JSON.parse(
  fs.readFileSync("docs/optimized-assets-manifest.json", "utf8"),
);
const proxy = await getPlatformProxy({
  configPath: "wrangler.jsonc",
  persist: true,
  remoteBindings: false,
});
try {
  const statements = [];
  for (const asset of data.assets) {
    const key = "webp/" + asset.sha256.slice(0, 16) + "/" + asset.filename;
    await proxy.env.BUCKET.put(key, fs.readFileSync(asset.path), {
      httpMetadata: { contentType: "image/webp" },
    });
    statements.push(
      proxy.env.DB.prepare(
        "UPDATE game_assets SET storage_key=? WHERE id=?",
      ).bind(key, asset.assetId),
    );
  }
  await proxy.env.DB.batch(statements);
  console.log(
    JSON.stringify({
      uploaded: data.assets.length,
      scope: "local R2 only",
      bytes: data.optimizedBytes,
    }),
  );
} finally {
  await proxy.dispose();
}

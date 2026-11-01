// Build-time asset encoding only. Never imported by a Cloudflare Worker.
import sharp from "sharp";
import fs from "node:fs";
import crypto from "node:crypto";
const source = JSON.parse(fs.readFileSync("docs/assets-manifest.json", "utf8"));
fs.mkdirSync("public/optimized", { recursive: true });
const items = [],
  statements = [];
const q = (v) =>
  v === null ? "NULL" : "'" + String(v).replaceAll("'", "''") + "'";
let originalBytes = 0,
  optimizedBytes = 0;
for (const asset of source.assets) {
  if (asset.status !== "generated") continue;
  const [width, height] =
    asset.kind === "cover"
      ? [800, 600]
      : asset.kind === "icon"
        ? [512, 512]
        : asset.kind === "home-banner"
          ? [1920, 800]
          : [1920, 1080];
  const output = await sharp(asset.path)
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
  const hash = crypto.createHash("sha256").update(output).digest("hex");
  const filename = asset.filename.replace(/\.png$/, ".webp"),
    id = "webp-" + asset.assetId + "-" + hash.slice(0, 10);
  const path = "public/optimized/" + filename;
  fs.writeFileSync(path, output);
  const item = {
    ...asset,
    assetId: id,
    sourceAssetId: asset.assetId,
    filename,
    path,
    width,
    height,
    bytes: output.length,
    sha256: hash,
    mediaType: "image/webp",
    status: "generated",
  };
  items.push(item);
  originalBytes += asset.bytes;
  optimizedBytes += output.length;
  statements.push(
    "INSERT OR IGNORE INTO game_assets(id,storage_key,media_type,size,original_name,game_id,version,predecessor_id) VALUES(" +
      [
        id,
        "bundled-optimized/" + filename,
        "image/webp",
        output.length,
        filename,
        asset.gameId ?? null,
        2,
        asset.assetId,
      ]
        .map(q)
        .join(",") +
      ");",
  );
  const match = `(id=${q(asset.assetId)} OR id LIKE ${q("webp-" + asset.assetId + "-%")})`;
  for (const field of ["cover_asset_id", "banner_asset_id"])
    statements.push(
      `UPDATE games SET ${field}=${q(id)} WHERE ${field} IN (SELECT id FROM game_assets WHERE ${match});`,
    );
  statements.push(
    `UPDATE events SET asset_id=${q(id)} WHERE asset_id IN (SELECT id FROM game_assets WHERE ${match});`,
  );
  statements.push(
    `UPDATE game_categories SET icon=${q(id)} WHERE icon IN (SELECT id FROM game_assets WHERE ${match});`,
  );
  statements.push(
    `UPDATE system_settings SET value=${q(id)} WHERE value IN (SELECT id FROM game_assets WHERE ${match});`,
  );
}
fs.writeFileSync(
  "docs/optimized-assets-manifest.json",
  JSON.stringify(
    {
      source: "85 original imagegen PNG files retained unchanged",
      encoding: "build-time WebP; no image processor in Workers runtime",
      originalBytes,
      optimizedBytes,
      savedPercent:
        Math.round((1 - optimizedBytes / originalBytes) * 10000) / 100,
      assets: items,
    },
    null,
    2,
  ) + "\n",
);
fs.writeFileSync("scripts/optimized-assets.sql", statements.join("\n") + "\n");
console.log(
  JSON.stringify({
    originalBytes,
    optimizedBytes,
    count: items.length,
    savedPercent:
      Math.round((1 - optimizedBytes / originalBytes) * 10000) / 100,
  }),
);

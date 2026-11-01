import fs from "node:fs";
import crypto from "node:crypto";
import sharp from "sharp";
const original = JSON.parse(
    fs.readFileSync("docs/assets-manifest.json", "utf8"),
  ),
  optimized = JSON.parse(
    fs.readFileSync("docs/optimized-assets-manifest.json", "utf8"),
  );
if (original.assets.length !== 85 || optimized.assets.length !== 85)
  throw Error("Expected 85 original and 85 delivery assets");
for (const item of [...original.assets, ...optimized.assets]) {
  const bytes = fs.readFileSync(item.path),
    hash = crypto.createHash("sha256").update(bytes).digest("hex");
  if (hash !== item.sha256) throw Error("Checksum mismatch: " + item.path);
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== item.width || metadata.height !== item.height)
    throw Error("Dimension mismatch: " + item.path);
}
if (
  new Set([...original.assets, ...optimized.assets].map((a) => a.sha256))
    .size !== 170
)
  throw Error("Duplicate media content");
console.log(
  "PASS all 170 original/delivery files, hashes and exact dimensions",
);

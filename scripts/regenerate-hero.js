const fs = require("fs");
const path = require("path");
let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.error("Missing dependency: please run `npm install sharp`");
  process.exit(1);
}

const srcDir = path.join(__dirname, "..", "img", "photos");
const outDir = path.join(__dirname, "..", "img", "optimized", "photos");
const sizes = [400, 800, 1200];
const filesToProcess = ["Hero-image.webp", "hero_image-mobile.webp"];

async function ensureDir(d) {
  await fs.promises.mkdir(d, { recursive: true });
}

async function regen() {
  await ensureDir(outDir);
  for (const file of filesToProcess) {
    const srcPath = path.join(srcDir, file);
    if (!fs.existsSync(srcPath)) {
      console.warn("Source not found:", srcPath);
      continue;
    }
    const base = path.basename(file).replace(/\.[^.]+$/, "");
    for (const w of sizes) {
      const outWebp = path.join(outDir, `${base}-${w}.webp`);
      const outAvif = path.join(outDir, `${base}-${w}.avif`);

      // WebP: higher-quality lossy compression
      await sharp(srcPath)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(outWebp)
        .catch((e) => console.error("webp error", e));

      // Do NOT generate AVIF for hero images to preserve original quality
      // (only WebP is produced)
    }
    console.log("Regenerated:", file);
  }

  // report sizes
  console.log("\nResulting files:");
  const outFiles = await fs.promises.readdir(outDir);
  outFiles
    .filter((f) => /Hero-image|hero_image-mobile/.test(f))
    .forEach((f) => {
      const p = path.join(outDir, f);
      const s = fs.statSync(p).size;
      console.log(f, "-", Math.round(s / 1024), "KB");
    });
}

regen().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});

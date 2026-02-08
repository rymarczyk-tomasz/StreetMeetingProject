const fs = require("fs");
const path = require("path");
let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.error("Missing dependency: please run `npm install sharp` first.");
  process.exit(1);
}

const sources = [
  { src: "img/photos", dest: "img/optimized/photos" },
  { src: "img/gallery", dest: "img/optimized/gallery" },
];

const sizes = [400, 800, 1200];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function processFile(filePath, destDir) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath, ext);

  if (![".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(ext)) return;

  for (const w of sizes) {
    const outNameWebp = path.join(destDir, `${base}-${w}.webp`);
    const outNameAvif = path.join(destDir, `${base}-${w}.avif`);

    await sharp(filePath)
      .resize({ width: w, withoutEnlargement: true })
      .toFile(outNameWebp)
      .catch((e) => console.error("sharp webp error", e));

    await sharp(filePath)
      .resize({ width: w, withoutEnlargement: true })
      .toFile(outNameAvif)
      .catch((e) => console.error("sharp avif error", e));
  }
}

async function walkAndProcess(srcDir, destDir) {
  try {
    await ensureDir(destDir);
    const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
    for (const ent of entries) {
      const srcPath = path.join(srcDir, ent.name);
      if (ent.isDirectory()) {
        await walkAndProcess(srcPath, path.join(destDir, ent.name));
      } else if (ent.isFile()) {
        await processFile(srcPath, destDir);
        console.log("Processed", srcPath);
      }
    }
  } catch (e) {
    console.error("Error processing", srcDir, e);
  }
}

(async () => {
  for (const item of sources) {
    await walkAndProcess(item.src, item.dest);
  }
  console.log("Image conversion finished. Output under img/optimized");
})();

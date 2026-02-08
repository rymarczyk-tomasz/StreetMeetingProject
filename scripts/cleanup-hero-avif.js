const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "img", "optimized", "photos");
const patterns = [/Hero-image-.*\.avif$/i, /hero_image-mobile-.*\.avif$/i];

async function run() {
  try {
    const files = await fs.promises.readdir(dir);
    const toRemove = files.filter((f) => patterns.some((p) => p.test(f)));
    if (!toRemove.length) {
      console.log("No hero AVIF files found to remove.");
      return;
    }
    for (const f of toRemove) {
      const p = path.join(dir, f);
      await fs.promises.unlink(p);
      console.log("Removed", f);
    }
    console.log("Cleanup complete.");
  } catch (e) {
    console.error("Cleanup failed", e);
    process.exit(1);
  }
}

run();

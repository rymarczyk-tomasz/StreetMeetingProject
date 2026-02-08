const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const optimizedDir = path.join(root, "img", "optimized");
const widths = [400, 800, 1200];
const exts = ["avif", "webp"];

function fileExists(p) {
  try {
    return fs.statSync(p).isFile();
  } catch (e) {
    return false;
  }
}

function buildSrcset(folder, basename, ext) {
  const parts = widths
    .map((w) => {
      const f = path.join(optimizedDir, folder, `${basename}-${w}.${ext}`);
      if (fileExists(f))
        return `img/optimized/${folder}/${basename}-${w}.${ext} ${w}w`;
      return null;
    })
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
if (!htmlFiles.length) {
  console.log("No HTML files found in", root);
  process.exit(0);
}

htmlFiles.forEach((file) => {
  const p = path.join(root, file);
  let content = fs.readFileSync(p, "utf8");
  let changed = false;
  content = content.replace(
    /<img\s+([^>]*?)src=(['"])(img\/[^'">]+)\2([^>]*)>/gi,
    (match, preAttrs, q, src, postAttrs) => {
      if (/\.svg($|\?)/i.test(src) || src.startsWith("data:")) return match;
      const attrsStr = (preAttrs + " " + postAttrs).trim();
      const altMatch = attrsStr.match(/alt=(['"])(.*?)\1/i);
      const classMatch = attrsStr.match(/class=(['"])(.*?)\1/i);
      const otherAttrs = attrsStr
        .replace(/alt=(['"]).*?\1/gi, "")
        .replace(/class=(['"]).*?\1/gi, "")
        .trim();

      const alt = altMatch ? altMatch[2] : "";
      const cls = classMatch ? classMatch[2] : "";
      const rel = src.replace(/^img\//, ""); // photos/foo.jpg or gallery/foo.jpg or Logo...
      const parts = rel.split("/");
      let folder = "photos";
      let filename = rel;
      if (parts.length > 1) {
        folder = parts[0];
        filename = parts.slice(1).join("/");
      }
      const basename = filename.replace(/\.[^/.]+$/, "");
      const avifSrcset = buildSrcset(folder, basename, "avif");
      const webpSrcset = buildSrcset(folder, basename, "webp");

      if (!avifSrcset && !webpSrcset) {
        return match; // no optimized assets
      }

      changed = true;

      const sizes = "(max-width: 800px) 100vw, 800px";

      let picture = "<picture>";
      if (avifSrcset)
        picture += `\n  <source type="image/avif" srcset="${avifSrcset}" sizes="${sizes}">`;
      if (webpSrcset)
        picture += `\n  <source type="image/webp" srcset="${webpSrcset}" sizes="${sizes}">`;
      const other = otherAttrs ? " " + otherAttrs : "";
      const classAttr = cls ? ` class="${cls}"` : "";
      const altAttr = alt ? ` alt="${alt}"` : ' alt=""';
      picture += `\n  <img src="${src}"${classAttr}${altAttr}${other}>\n</picture>`;

      return picture;
    },
  );

  if (changed) {
    fs.writeFileSync(p, content, "utf8");
    console.log("Updated", file);
  } else {
    console.log("No changes for", file);
  }
});

console.log("Done.");

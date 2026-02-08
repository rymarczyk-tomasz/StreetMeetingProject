const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exts = ['.js', '.css', '.html'];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile()) processFile(full);
  }
}

function processFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (!exts.includes(ext)) return;
  let src = fs.readFileSync(file, 'utf8');
  let out = src;
  try {
    if (ext === '.html') {
      out = out.replace(/<!--([\s\S]*?)-->/g, '');
    } else if (ext === '.css') {
      out = out.replace(/\/\*[\s\S]*?\*\//g, '');
    } else if (ext === '.js') {
      out = out.replace(/\/\*[\s\S]*?\*\//g, '');
      out = out.replace(/^\s*\/\/.*$/gm, '');
    }
    out = out.replace(/\n{3,}/g, '\n\n');
    if (out !== src) {
      fs.writeFileSync(file, out, 'utf8');
      console.log('Stripped comments in', path.relative(root, file));
    }
  } catch (e) {
    console.error('Failed to process', file, e);
  }
}

walk(root);
console.log('Comment stripping complete.');

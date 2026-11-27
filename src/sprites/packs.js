// 그림 묶음(AI로 만든 캐릭터 시트를 tools/import-pack.js로 가져온 것)
const path = require("path");
const fs = require("fs");

const cache = new Map();
const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

function loadPack(id) {
  if (!cache.has(id)) cache.set(id, JSON.parse(fs.readFileSync(path.join(__dirname, "packs", `${id}.json`), "utf8")));
  return cache.get(id);
}

function bounds(px, cols, rows) {
  let x0 = cols, y0 = rows, x1 = -1, y1 = -1;
  for (let i = 0; i < px.length; i++) if (px[i]) { const x = i % cols, y = (i - x) / cols; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

// 발밑 그림자: 맨 아래 4줄에 칠해진 가로 범위를 따라 납작한 타원
function shadowFor(px, cols, rows, baseRow) {
  let lo = cols, hi = -1;
  for (let y = Math.max(0, baseRow - 3); y <= baseRow; y++) for (let x = 0; x < cols; x++) if (px[y * cols + x]) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const out = new Array(cols * rows).fill(false);
  if (hi < 0) return out;
  const cx = (lo + hi + 1) / 2, rx = (hi - lo + 1) / 2 * 1.1 + 2, cy = baseRow + 1, ry = 1.6;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) out[y * cols + x] = true;
  }
  return out;
}

function packFrames(id) {
  const pack = loadPack(id);
  const out = new Map();
  for (const [key, s] of Object.entries(pack.frames)) {
    const px = [...s].map(ch => (ch === "." ? null : pack.palette[DIGITS.indexOf(ch)]));
    out.set(key, { w: pack.cols, h: pack.rows, px, shadow: shadowFor(px, pack.cols, pack.rows, pack.baseRow) });
  }
  return out;
}

module.exports = { loadPack, packFrames, bounds };

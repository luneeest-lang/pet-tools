// 그림 칸 크기와 몸 치수(칸 단위). 코드로 그린 펫은 48x40, 그림 묶음 펫은 묶음의 격자를 쓴다.
const { loadPack, packFrames, bounds } = require("./packs.js");

const PROCEDURAL = { cols: 48, rows: 40, baseRow: 38, halfW: 22, hangDrop: 17, edgeIn: 8, hopOut: 30 };
const cache = new Map();

function geometryOf(spec) {
  if (!spec || !spec.pack) return { ...PROCEDURAL };
  if (cache.has(spec.pack)) return { ...cache.get(spec.pack) };
  const pack = loadPack(spec.pack), frames = packFrames(spec.pack);
  const { cols, rows, baseRow } = pack;
  // 몸 반폭: 걷기 첫 그림의 가로 폭 절반
  const walk = bounds(frames.get("walk:0:").px, cols, rows);
  const halfW = Math.round((walk.x1 - walk.x0 + 1) / 2);
  // 매달릴 때: 위쪽 60% 안에서 가장 넓은 줄(턱 옆으로 벌린 앞발)이 창 윗선에 닿는다.
  const held = frames.get("held:0:");
  const hb = bounds(held.px, cols, rows);
  let pawRow = hb.y0, widest = -1;
  for (let y = hb.y0; y <= hb.y0 + (hb.y1 - hb.y0) * 0.6; y++) {
    let lo = cols, hi = -1;
    for (let x = 0; x < cols; x++) if (held.px[y * cols + x]) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    if (hi - lo > widest) { widest = hi - lo; pawRow = y; }
  }
  const g = { cols, rows, baseRow, halfW, hangDrop: baseRow - pawRow, edgeIn: Math.round(cols / 6), hopOut: Math.round(cols * 0.6) };
  cache.set(spec.pack, g);
  return { ...g };
}

// 화면 크기 설정(2·3·4) → 그림 한 칸의 화면 픽셀. 그림 묶음은 해상도가 두 배라 1·2·3픽셀로 그린다.
function screenGeometry(spec, scale) {
  const g = geometryOf(spec);
  const px = spec && spec.pack ? ({ 2: 1, 3: 2, 4: 3 }[scale] || 2) : scale;
  return {
    ...g, px,
    w: g.cols * px, h: g.rows * px,
    footPad: (g.rows - g.baseRow) * px,
    halfWpx: g.halfW * px, hangDropPx: g.hangDrop * px, edgeInPx: g.edgeIn * px, hopOutPx: g.hopOut * px
  };
}

module.exports = { geometryOf, screenGeometry, PROCEDURAL };

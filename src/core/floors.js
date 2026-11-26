// 바닥 선: 펫 발이 닿는 가로 선. 1단계는 화면마다 작업 영역 아래 끝(작업 표시줄 위)만 쓴다.
function groundFloors(displays) {
  return displays.map(d => ({
    id: `ground:${d.id}`, kind: "ground", displayId: d.id,
    y: d.workArea.y + d.workArea.height, x1: d.workArea.x, x2: d.workArea.x + d.workArea.width
  }));
}

function floorBelow(x, y, floors) {
  let best = null;
  for (const f of floors) if (x >= f.x1 && x <= f.x2 && f.y >= y && (!best || f.y < best.y)) best = f;
  return best;
}

function inArea(p, a) {
  return p.x >= a.x && p.x <= a.x + a.width && p.y >= a.y && p.y <= a.y + a.height;
}

function clampToDisplays(pt, displays) {
  const hit = displays.find(d => inArea(pt, d.workArea));
  if (hit) return { x: pt.x, y: pt.y, displayId: hit.id };
  let best = null;
  for (const d of displays) {
    const a = d.workArea;
    const x = Math.min(Math.max(pt.x, a.x), a.x + a.width), y = Math.min(Math.max(pt.y, a.y), a.y + a.height);
    const dist = Math.hypot(x - pt.x, y - pt.y);
    if (!best || dist < best.dist) best = { x, y, displayId: d.id, dist };
  }
  return best ? { x: best.x, y: best.y, displayId: best.displayId } : { ...pt, displayId: null };
}

module.exports = { groundFloors, floorBelow, clampToDisplays, inArea };

// 열린 창의 윗변을 바닥으로. 앞쪽 창(배열 앞)에 가려진 구간은 뺀다.
const MIN_PIECE = 40, TOP_MARGIN = 2;

function subtract(spans, a, b) {
  const out = [];
  for (const [s, e] of spans) {
    if (b <= s || a >= e) { out.push([s, e]); continue; }
    if (a > s) out.push([s, a]);
    if (b < e) out.push([b, e]);
  }
  return out;
}

function windowFloors(wins, displays, opts = {}) {
  const minWidth = opts.minWidth ?? 200;
  const floors = [];
  wins.forEach((w, i) => {
    if (!(w.width >= minWidth)) return;
    const y = w.y;
    // 윗변이 가장 많이 걸쳐 있는 화면
    let d = null, best = 0;
    for (const dd of displays) {
      const a = dd.workArea;
      if (y < a.y || y > a.y + a.height) continue;
      const overlap = Math.min(w.x + w.width, a.x + a.width) - Math.max(w.x, a.x);
      if (overlap > best) { best = overlap; d = dd; }
    }
    if (!d || y <= d.workArea.y + TOP_MARGIN) return; // 화면 밖·최대화·맨 위에 붙은 창
    let spans = [[Math.max(w.x, d.workArea.x), Math.min(w.x + w.width, d.workArea.x + d.workArea.width)]];
    for (let j = 0; j < i; j++) {
      const f = wins[j];
      if (f.y <= y && y < f.y + f.height) spans = subtract(spans, f.x, f.x + f.width);
    }
    spans.filter(([s, e]) => e - s >= MIN_PIECE).forEach(([s, e], k) => {
      floors.push({ id: `win:${w.id}:${k}`, kind: "window", windowId: w.id, displayId: d.id, y, x1: s, x2: e });
    });
  });
  return floors;
}

module.exports = { windowFloors };

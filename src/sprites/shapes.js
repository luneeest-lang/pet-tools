// 도형 판정과 명암용 법선. 좌표는 48x40 격자 칸, 칸 가운데(x+0.5, y+0.5)를 기준으로 판정한다.
const GW = 48, GH = 40;
const LIGHT = (() => { const x = -0.55, y = -0.83, l = Math.hypot(x, y); return [x / l, y / l]; })();

function ellIn(x, y, e) {
  const dx = (x + 0.5 - e.cx) / e.rx, dy = (y + 0.5 - e.cy) / e.ry;
  const d = dx * dx + dy * dy;
  if (e.fluff) { const a = Math.atan2(dy, dx); const k = 1 + e.fluff * Math.sin(a * (e.lobes || 9) + (e.ph || 0)); return d <= k * k; }
  return d <= 1;
}
function triIn(x, y, p) {
  const px = x + 0.5, py = y + 0.5;
  const s = (a, b) => (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1]);
  const d1 = s(p[0], p[1]), d2 = s(p[1], p[2]), d3 = s(p[2], p[0]);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
function nearestCircle(x, y, c) {
  let bi = 0, bd = 1e9;
  c.forEach((k, i) => { const d = Math.hypot(x + 0.5 - k.x, y + 0.5 - k.y) / k.r; if (d < bd) { bd = d; bi = i; } });
  return bi;
}
function inside(x, y, s) {
  if (s.t === "tri") return triIn(x, y, s.p);
  if (s.t === "chain") return s.c.some(k => (x + 0.5 - k.x) ** 2 + (y + 0.5 - k.y) ** 2 <= k.r * k.r);
  return ellIn(x, y, s);
}
function normal(x, y, s) {
  if (s.t === "chain") { const k = s.c[nearestCircle(x, y, s.c)]; return [(x + 0.5 - k.x) / k.r, (y + 0.5 - k.y) / k.r]; }
  const e = s.t === "tri" ? s.se : s;
  return [(x + 0.5 - e.cx) / e.rx, (y + 0.5 - e.cy) / e.ry];
}

module.exports = { GW, GH, LIGHT, ellIn, triIn, nearestCircle, inside, normal };

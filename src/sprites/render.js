// 부위 목록 → 48x40 색 배열. 명암, 안쪽 선, 그림자, 반사광, 외곽선, 얼굴 순서로 칠한다.
const { GW, GH, LIGHT, ellIn, triIn, nearestCircle, inside, normal } = require("./shapes.js");
const { buildParts } = require("./poses.js");
const { buildPalette, hexToHsl } = require("./palette.js");

// 크고 동그란 눈(5x6): 검은 눈 + 반짝임 2칸 + 아래쪽에 비치는 눈동자 색
const EYE = [".KKK.", "KHHKK", "KHHKK", "KKKKK", "KIISK", ".KKK."];
// 어두운 털에서는 검은 눈이 털에 묻히므로 눈동자 색을 넓게 칠한다.
const EYE_DARK = [".KKK.", "KHHIK", "KHIIK", "KIKIK", "KIISK", ".KKK."];
// 시무룩한 눈: 위가 평평하게 반쯤 감긴 눈
const EYE_SAD = ["KKKKK", "KHHKK", "KKKKK", ".KKK."];
const EYE_SAD_DARK = ["KKKKK", "KHHIK", "KIISK", ".KKK."];
const CAT_EYE_X = [-7, 1], EYE_Y = -3, NOSE_DY = 1;
const STAMP_KEYS = { K: "K", H: "H", S: "S", I: "IR", J: "IR2", N: "N", n: "NH", Q: "Q", P: "P", D: "PD" };

function paintBody(parts) {
  const N = GW * GH;
  const id = new Int16Array(N).fill(-1);
  const ramp = new Array(N).fill(null);
  const tone = new Int8Array(N);
  const vv = new Float32Array(N);
  parts.forEach((p, i) => {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if (!inside(x, y, p.s)) continue;
      const k = y * GW + x;
      id[k] = i;
      const [nx, ny] = normal(x, y, p.s);
      const v = nx * LIGHT[0] + ny * LIGHT[1];
      const r = Math.hypot(nx, ny);
      vv[k] = v;
      let t = v > 0.5 ? 1 : v > -0.28 ? 2 : 3;
      if (p.spec && v > 0.6 && r > 0.42 && r < 0.82) t = 0;
      if (p.dark) t = Math.min(4, t + 1);
      let rp = "F";
      if (p.inner && triIn(x, y, p.inner)) { rp = "I"; t = t <= 2 ? 1 : 2; }
      else {
        if (p.cream && p.cream.some(c => ellIn(x, y, c))) rp = "C";
        if (p.sock) {
          const bottom = Math.floor(p.s.cy + p.s.ry - 0.01);
          if (y > bottom - (p.sockRows || 2)) rp = "C";
        }
        if (rp === "F") {
          let stripe = false;
          if (p.stripes && (p.g === "body" || p.g === "haunch")) stripe = ((x * 0.85 - y * 0.5) % 4.4 + 4.4) % 4.4 < 1.15 && y < p.s.cy + p.s.ry * 0.55;
          else if (p.stripes) stripe = y % 3 === 0;
          if (p.rings) stripe = nearestCircle(x, y, p.s.c) % 3 === 2;
          if (stripe) t = Math.min(4, t + 1);
        }
      }
      if (rp === "C" && t > 1) t -= 1; // 흰 털은 한 단계 밝게
      ramp[k] = rp; tone[k] = t;
    }
  });
  return { id, ramp, tone, vv };
}

function shadeContacts(parts, { id, ramp, tone, vv }) {
  const r2 = ramp.slice(), t2 = Int8Array.from(tone);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const k = y * GW + x, i = id[k];
    if (i < 0) continue;
    const p = parts[i];
    let line = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const j = id[ny * GW + nx];
      if (j >= 0 && j !== i && parts[j].z > p.z && parts[j].g !== p.g) { line = true; break; }
    }
    if (line) { t2[k] = 4; if (r2[k] === "I") r2[k] = "F"; continue; }
    let cast = false;
    for (const [dx, dy] of [[0, -1], [0, -2], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0) continue;
      const j = id[ny * GW + nx];
      if (j >= 0 && parts[j].z > p.z && parts[j].g !== p.g) { cast = true; break; }
    }
    if (cast && r2[k] !== "I") { t2[k] = tone[k] >= 3 ? 4 : 3; continue; }
    if (p.rim && vv[k] < -0.62) {
      const below = y + 1 < GH ? id[(y + 1) * GW + x] : -1, right = x + 1 < GW ? id[y * GW + x + 1] : -1;
      if ((below < 0 || right < 0) && tone[k] === 3) t2[k] = 2;
    }
  }
  return { r2, t2 };
}

function outline(id, r2, t2) {
  const N = GW * GH;
  const px = new Array(N).fill(null);
  for (let k = 0; k < N; k++) if (id[k] >= 0) px[k] = r2[k] + t2[k];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const k = y * GW + x;
    if (id[k] >= 0) continue;
    let nb = -1, lit = false;
    for (const [dx, dy, l] of [[0, 1, true], [1, 0, true], [0, -1, false], [-1, 0, false]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const kk = ny * GW + nx;
      if (id[kk] >= 0 && nb < 0) { nb = kk; lit = l; }
    }
    if (nb >= 0) {
      const cream = r2[nb] === "C" || r2[nb] === "I";
      px[k] = cream ? (lit ? "OCL" : "OC") : (lit ? "OL" : "O");
    }
  }
  return px;
}

function isDarkCoat(spec) {
  return !spec.palette && !!spec.colors && hexToHsl(spec.colors.main).l < 0.25;
}

function faceOf(pose, flags) {
  const eyes = flags.yawn ? "yawn" : (pose === "sleep" || flags.blink) ? "closed" : flags.happy ? "happy" : flags.sad ? "sad" : "open";
  const mouth = flags.yawn ? "yawn" : flags.sad ? "flat" : "smile";
  return { eyes, mouth, tongue: !!flags.happy && pose !== "sleep" };
}

function paintFace(px, B, head, face, darkCoat) {
  const hx = Math.round(head.cx), hy = Math.round(head.cy);
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < GW && y < GH) px[y * GW + x] = c; };
  const stamp = (x0, y0, rows) => rows.forEach((r, dy) => [...r].forEach((ch, dx) => {
    if (ch !== ".") put(x0 + dx, y0 + dy, STAMP_KEYS[ch]);
  }));
  const dog = B.species === "dog";
  const eyesX = dog ? [hx - 6, hx + 4] : CAT_EYE_X.map(d => hx + d);
  const ey = hy + EYE_Y;
  eyesX.forEach((ex, idx) => {
    if (face.eyes === "yawn") {
      if (idx === 0) stamp(ex + 1, ey + 1, ["KK..", "..KK", "KK.."]); else stamp(ex, ey + 1, ["..KK", "KK..", "..KK"]);
    } else if (face.eyes === "closed") stamp(ex, ey + 2, ["K...K", ".KKK."]);
    else if (face.eyes === "happy") stamp(ex, ey + 2, [".KKK.", "K...K"]);
    else if (face.eyes === "sad") stamp(ex, ey + 2, darkCoat ? EYE_SAD_DARK : EYE_SAD);
    else stamp(ex, ey, darkCoat ? EYE_DARK : EYE);
  });
  if (dog && B.brows) eyesX.forEach(ex => { put(ex + 1, ey - 2, "C1"); put(ex + 2, ey - 2, "C1"); put(ex + 3, ey - 2, "C1"); });
  if (!dog && B.stripes) {
    [[hx - 2, hy - 7], [hx - 2, hy - 6], [hx, hy - 8], [hx, hy - 7], [hx, hy - 6], [hx + 2, hy - 7], [hx + 2, hy - 6],
     [hx - 10, hy + 2], [hx - 11, hy + 3], [hx + 10, hy + 2], [hx + 11, hy + 3]]
      .forEach(([x, y]) => { const c = px[y * GW + x]; if (c && c[0] === "F") put(x, y, "F3"); });
  }
  const cx = dog ? hx + 1 : hx - 1, ny = hy + 2 + NOSE_DY;
  if (dog) stamp(cx - 1, ny, ["NnN", "NNN", ".N."]);
  else stamp(cx - 1, ny, ["QQQ", ".Q."]);
  const my = dog ? ny + 3 : ny + 2;
  if (face.mouth === "yawn") stamp(cx - 1, my, ["DDD", "DPD", ".D."]);
  else if (face.mouth === "flat") [[cx - 1, my + 1], [cx, my + 1], [cx + 1, my + 1]].forEach(([x, y]) => put(x, y, "MO"));
  else if (face.mouth === "o") [[cx, my], [cx - 1, my + 1], [cx + 1, my + 1], [cx, my + 2]].forEach(([x, y]) => put(x, y, "MO"));
  else {
    [[cx - 2, my], [cx - 1, my + 1], [cx, my], [cx + 1, my + 1], [cx + 2, my]].forEach(([x, y]) => put(x, y, "MO"));
    if (face.tongue) { put(cx - 1, my + 2, "P"); put(cx, my + 2, "P"); put(cx + 1, my + 2, "P"); put(cx, my + 3, "P"); }
  }
  const blush = dog ? [hx - 9, hx + 10] : [hx - 8, hx + 6];
  blush.forEach(bx => { put(bx, hy + 2, "B"); put(bx + 1, hy + 2, "B"); });
  if (!dog) {
    const wy = hy + 3;
    [[hx - 10, wy], [hx - 11, wy], [hx - 12, wy], [hx - 13, wy - 1], [hx - 10, wy + 2], [hx - 11, wy + 2], [hx - 12, wy + 3], [hx - 13, wy + 3],
     [hx + 9, wy], [hx + 10, wy], [hx + 11, wy], [hx + 12, wy - 1], [hx + 9, wy + 2], [hx + 10, wy + 2], [hx + 11, wy + 3], [hx + 12, wy + 3]]
      .forEach(([x, y]) => put(x, y, "WH"));
  }
}

// 색 키 배열(px)까지만 만든다. 새 동작 그림의 테스트에서 키를 직접 볼 수 있게 따로 둔다.
function renderKeys(spec, pose, frame, flags) {
  flags = flags || {};
  const { parts, head, shadow, traits, face, flip } = buildParts(spec, pose, frame, flags);
  parts.forEach((p, i) => { p._o = i; });
  parts.sort((a, b) => a.z - b.z || a._o - b._o);
  const painted = paintBody(parts);
  const { r2, t2 } = shadeContacts(parts, painted);
  const px = outline(painted.id, r2, t2);
  paintFace(px, traits, head, face || faceOf(pose, flags), isDarkCoat(spec));
  return { px: flip ? mirror(px) : px, shadowShape: shadow, flip };
}

function mirror(arr) {
  const out = new Array(arr.length);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) out[y * GW + x] = arr[y * GW + (GW - 1 - x)];
  return out;
}

function renderFrame(spec, pose, frame, flags) {
  const { px, shadowShape, flip } = renderKeys(spec, pose, frame, flags);
  const pal = buildPalette(spec);
  let shadow = new Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) shadow[y * GW + x] = ellIn(x, y, shadowShape);
  if (flip) shadow = mirror(shadow);
  return { w: GW, h: GH, px: px.map(k => (k ? pal[k] : null)), shadow };
}

module.exports = { renderFrame, renderKeys };

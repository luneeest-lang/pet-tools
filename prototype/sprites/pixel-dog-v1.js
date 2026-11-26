// Pixel dog sprite generator: shapes -> shaded pixels -> outlines -> face details.
(function (root) {
  const GW = 48, GH = 40;
  // material indices
  const M = { E: 0, F1: 1, F2: 2, F3: 3, C1: 4, C2: 5, C3: 6, I1: 7, I2: 8, L: 9, LC: 10, O: 11, OC: 12, K: 13, H: 14, N: 15, NH: 16, MO: 17, P: 18, B: 19, SH: 20, D3: 21 };

  const BREEDS = {
    shiba: {
      name: "시바견", ears: "pointy", tail: "curl", socks: true, brows: true, muzzle: true, belly: true,
      pal: { F1: "#f7b56a", F2: "#e38a3a", F3: "#b9612a", D3: "#93461d", C1: "#fffaf1", C2: "#f5e3c6", C3: "#d9bd97", I1: "#f6c1b0", I2: "#e39a88",
             L: "#7a3a17", LC: "#a8876a", O: "#3f1d0c", OC: "#7c5c45", K: "#1d1210", H: "#ffffff", N: "#2a1912", NH: "#7b5a4c", MO: "#6b4a3a", P: "#f0788c", B: "#f59aa8" }
    },
    maltese: {
      name: "몰티즈", ears: "floppy", tail: "plume", socks: false, brows: false, muzzle: true, belly: false,
      pal: { F1: "#ffffff", F2: "#f3eee7", F3: "#d8cdbf", D3: "#c2b5a5", C1: "#ffffff", C2: "#faf7f2", C3: "#e6ddd0", I1: "#f6d4cf", I2: "#e9b9b1",
             L: "#b3a291", LC: "#c2b4a5", O: "#6f6157", OC: "#7f7166", K: "#17110f", H: "#ffffff", N: "#231916", NH: "#6b5a52", MO: "#8a776b", P: "#f2879a", B: "#f7aab6" }
    },
    blacktan: {
      name: "블랙탄", ears: "pointy", tail: "curl", socks: true, brows: true, muzzle: true, belly: true,
      pal: { F1: "#5d5553", F2: "#3b3534", F3: "#262121", D3: "#1a1616", C1: "#f7e2c0", C2: "#e3bf8c", C3: "#c09363", I1: "#d9a99a", I2: "#b98476",
             L: "#110d0d", LC: "#8d6a47", O: "#0d0a0a", OC: "#5a4029", K: "#0b0808", H: "#ffffff", N: "#0e0a0a", NH: "#4a4140", MO: "#6a4a33", P: "#ef7488", B: "#f29aa8" }
    }
  };

  const LIGHT = (() => { const x = -0.55, y = -0.83, l = Math.hypot(x, y); return [x / l, y / l]; })();

  function inEll(x, y, e) {
    const dx = (x + 0.5 - e.cx) / e.rx, dy = (y + 0.5 - e.cy) / e.ry;
    return dx * dx + dy * dy <= 1;
  }
  function inTri(x, y, p) {
    const px = x + 0.5, py = y + 0.5;
    const s = (a, b) => (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1]);
    const d1 = s(p[0], p[1]), d2 = s(p[1], p[2]), d3 = s(p[2], p[0]);
    const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  }
  function shadeOf(x, y, e) {
    const nx = (x + 0.5 - e.cx) / e.rx, ny = (y + 0.5 - e.cy) / e.ry;
    return nx * LIGHT[0] + ny * LIGHT[1];
  }

  // Build the list of parts for a pose
  function buildParts(breed, pose, f, opt) {
    const b = BREEDS[breed];
    const parts = [];
    const add = (o) => parts.push(o);
    let head, body;

    if (pose === "walk") {
      const bob = [0, -1, 0, -1][f];
      const A = [-1.6, 0, 1.6, 0][f], Al = [0, 1.2, 0, 0][f];
      const Bx = [1.6, 0, -1.6, 0][f], Bl = [0, 0, 0, 1.2][f];
      body = { cx: 19.5, cy: 27 + bob, rx: 11.5, ry: 7.6 };
      head = { cx: 31, cy: 15.5 + bob, rx: 12, ry: 10.4 };
      const leg = (cx, cy, lift) => ({ cx, cy: cy - lift, rx: 2.7, ry: 4.3 });
      tail(b, 9.5 + [0, 0.6, 0, -0.6][f], 18 + bob, add);
      add({ g: "far", z: 1, shape: leg(12 + Bx, 33.6, Bl), mat: "fur", dark: true, sock: b.socks });
      add({ g: "far", z: 1, shape: leg(26 + A, 33.6, Al), mat: "fur", dark: true, sock: b.socks });
      add({ g: "body", z: 2, shape: body, mat: "fur", cream: b.belly ? { cx: 25, cy: 31.5 + bob, rx: 7, ry: 4.6 } : null });
      add({ g: "near", z: 3, shape: leg(16 + A, 34, Al), mat: "fur", sock: b.socks });
      add({ g: "near", z: 3, shape: leg(29.5 + Bx, 34, Bl), mat: "fur", sock: b.socks });
      shadowE = { cx: 21, cy: 38.6, rx: 15, ry: 1.6 };
    } else if (pose === "sit") {
      body = { cx: 21, cy: 28.5, rx: 9.2, ry: 8.6 };
      head = { cx: 30.5, cy: 15 + (f === 1 ? 0.4 : 0), rx: 12, ry: 10.4 };
      tail(b, 9 + (f === 1 ? -0.7 : 0.4), 25, add);
      add({ g: "far", z: 1, shape: { cx: 24.5, cy: 34, rx: 2.4, ry: 4.4 }, mat: "fur", dark: true, sock: b.socks });
      add({ g: "body", z: 2, shape: body, mat: "fur", cream: b.belly ? { cx: 26.5, cy: 27, rx: 4.6, ry: 7 } : null });
      add({ g: "haunch", z: 2.5, shape: { cx: 15.5, cy: 32, rx: 7, ry: 5.6 }, mat: "fur" });
      add({ g: "near", z: 3, shape: { cx: 13.5, cy: 37, rx: 4.4, ry: 1.9 }, mat: "fur", sock: b.socks, sockRows: 2 });
      add({ g: "near2", z: 3.2, shape: { cx: 28.6, cy: 34, rx: 2.5, ry: 4.6 }, mat: "fur", sock: b.socks });
      shadowE = { cx: 21, cy: 38.6, rx: 13, ry: 1.6 };
    } else { // sleep
      const br = f === 1 ? 0.5 : 0;
      body = { cx: 22, cy: 33 - br / 2, rx: 12.5, ry: 5.6 + br };
      head = { cx: 32.5, cy: 28.5, rx: 11.6, ry: 9.4 };
      tail(b, 13, 30.5 - br / 2, add, true);
      add({ g: "body", z: 2, shape: body, mat: "fur", cream: null });
      opt.pawsFront = { cx: 39.5, cy: 37.2, rx: 4.2, ry: 1.8 };
      shadowE = { cx: 23, cy: 38.8, rx: 17, ry: 1.5 };
    }

    // ears + head
    const hx = head.cx, hy = head.cy;
    if (b.ears === "pointy") {
      const far = [[hx - 10.5, hy - 4], [hx - 8, hy - 15], [hx - 2, hy - 8]];
      const near = [[hx + 3, hy - 8.5], [hx + 9.5, hy - 15], [hx + 11.5, hy - 3.5]];
      add({ g: "ear", z: 4, tri: far, mat: "fur", shadeE: { cx: hx - 7, cy: hy - 9, rx: 5, ry: 6 }, inner: [[hx - 8.6, hy - 6], [hx - 7.6, hy - 12.2], [hx - 4.2, hy - 8]] });
      add({ g: "ear2", z: 4, tri: near, mat: "fur", shadeE: { cx: hx + 8, cy: hy - 9, rx: 5, ry: 6 }, inner: [[hx + 5.4, hy - 8.4], [hx + 9.2, hy - 12.4], [hx + 9.8, hy - 5.6]] });
    }
    add({ g: "head", z: 5, shape: head, mat: "fur",
          cream: b.muzzle ? { cx: hx + 3.6, cy: hy + 5.4, rx: 8, ry: 5 } : null,
          cream2: b.brows ? [{ x: hx - 4, y: hy - 4 }, { x: hx - 3, y: hy - 4 }, { x: hx + 6, y: hy - 4 }, { x: hx + 7, y: hy - 4 }] : null });
    if (b.ears === "floppy") {
      // 늘어진 귀는 머리 뒤에 두어 얼굴(눈, 볼)을 가리지 않게 한다
      add({ g: "ear", z: 4.5, shape: { cx: hx - 11.4, cy: hy + 2.5, rx: 3.6, ry: 7.4 }, mat: "fur", dark: true });
      add({ g: "ear2", z: 4.6, shape: { cx: hx + 11.9, cy: hy + 2.5, rx: 3.5, ry: 7.4 }, mat: "fur" });
    }
    if (opt.pawsFront) add({ g: "paw", z: 7, shape: opt.pawsFront, mat: "fur", sock: b.socks, sockRows: 2 });
    return { parts, head, shadowE };
  }
  let shadowE = null;

  function tail(b, cx, cy, add, sleeping) {
    if (b.tail === "curl") {
      add({ g: "tail", z: sleeping ? 2.6 : 0, shape: { cx, cy, rx: 4.8, ry: 4.6 }, mat: "fur", cream: { cx: cx + 0.8, cy: cy + 0.9, rx: 2.2, ry: 2.1 } });
    } else {
      add({ g: "tail", z: sleeping ? 2.6 : 0, shape: sleeping ? { cx, cy: cy + 1, rx: 5.5, ry: 3.4 } : { cx, cy: cy - 1, rx: 3.8, ry: 5.6 }, mat: "fur" });
    }
  }

  function render(breed, pose, f, flags) {
    flags = flags || {};
    const opt = {};
    const { parts, head } = buildParts(breed, pose, f, opt);
    const b = BREEDS[breed];
    const id = new Int16Array(GW * GH).fill(-1);
    const mat = new Uint8Array(GW * GH);
    parts.sort((a, c) => a.z - c.z);
    parts.forEach((p, i) => {
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const inside = p.tri ? inTri(x, y, p.tri) : inEll(x, y, p.shape);
        if (!inside) continue;
        const k = y * GW + x;
        id[k] = i;
        const se = p.shadeE || p.shape;
        const v = shadeOf(x, y, se);
        let cream = (p.cream && inEll(x, y, p.cream)) || false;
        if (p.sock) {
          const bottom = Math.floor(p.shape.cy + p.shape.ry - 0.01);
          if (y > bottom - (p.sockRows || 2)) cream = true;
        }
        let tone = v > 0.42 ? 1 : v < -0.38 ? 3 : 2;
        if (p.dark) tone = Math.min(3, tone + 1);
        if (p.tri && p.inner && inTri(x, y, p.inner)) { mat[k] = tone <= 2 ? M.I1 : M.I2; continue; }
        if (cream) mat[k] = [0, M.C1, M.C2, M.C3][tone];
        else mat[k] = [0, M.F1, M.F2, M.F3][tone];
      }
      if (p.cream2) p.cream2.forEach(pt => { const x = Math.round(pt.x), y = Math.round(pt.y); const k = y * GW + x; if (id[k] === i) mat[k] = M.C2; });
    });

    const isCream = m => m === M.C1 || m === M.C2 || m === M.C3 || m === M.I1 || m === M.I2;
    const groupOf = i => parts[i].g;
    // cast shadow under head / between parts, and inner contour lines
    const out = mat.slice();
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const k = y * GW + x; const i = id[k]; if (i < 0) continue;
      const p = parts[i];
      // contour: a neighbour belongs to a part drawn in front, from another group
      let line = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const j = id[ny * GW + nx];
        if (j >= 0 && j !== i && parts[j].z > p.z && groupOf(j) !== p.g) { line = true; break; }
      }
      if (line) { out[k] = isCream(mat[k]) ? M.LC : M.L; continue; }
      // soft cast shadow below parts in front
      for (const [dx, dy] of [[0, -1], [0, -2], [-1, -1]]) {
        const nx = x + dx, ny = y + dy; if (ny < 0 || nx < 0) continue;
        const j = id[ny * GW + nx];
        if (j >= 0 && parts[j].z > p.z && groupOf(j) !== p.g) {
          out[k] = isCream(mat[k]) ? M.C3 : (mat[k] === M.F3 ? M.D3 : M.F3);
          break;
        }
      }
    }
    // outer outline
    const final = out.slice();
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const k = y * GW + x; if (id[k] >= 0) continue;
      let nb = -1;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const kk = ny * GW + nx; if (id[kk] >= 0) { nb = kk; break; }
      }
      if (nb >= 0) final[k] = isCream(out[nb]) ? M.OC : M.O;
    }

    // face details relative to the head center
    const hx = Math.round(head.cx), hy = Math.round(head.cy);
    const put = (x, y, m) => { if (x >= 0 && y >= 0 && x < GW && y < GH) final[y * GW + x] = m; };
    const eyes = [[hx - 4, hy - 1], [hx + 6, hy - 1]];
    const closed = pose === "sleep" || flags.blink;
    eyes.forEach(([ex, ey]) => {
      if (closed) { put(ex - 1, ey + 1, M.K); put(ex, ey + 2, M.K); put(ex + 1, ey + 2, M.K); put(ex + 2, ey + 1, M.K); }
      else if (flags.happy) { put(ex - 1, ey + 2, M.K); put(ex, ey + 1, M.K); put(ex + 1, ey + 1, M.K); put(ex + 2, ey + 2, M.K); }
      else {
        for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++) put(ex + dx, ey + dy, M.K);
        put(ex, ey, M.H); put(ex + 1, ey + 2, M.NH);
      }
    });
    // nose
    put(hx + 2, hy + 3, M.N); put(hx + 3, hy + 3, M.NH); put(hx + 4, hy + 3, M.N);
    put(hx + 2, hy + 4, M.N); put(hx + 3, hy + 4, M.N); put(hx + 4, hy + 4, M.N); put(hx + 3, hy + 5, M.N);
    // mouth (omega shape)
    put(hx + 1, hy + 6, M.MO); put(hx + 2, hy + 7, M.MO); put(hx + 3, hy + 6, M.MO); put(hx + 4, hy + 7, M.MO); put(hx + 5, hy + 6, M.MO);
    if (flags.happy && pose !== "sleep") { put(hx + 2, hy + 8, M.P); put(hx + 3, hy + 8, M.P); put(hx + 4, hy + 8, M.P); put(hx + 3, hy + 9, M.P); put(hx + 2, hy + 9, M.P); }
    // blush
    if (pose !== "sleep" || true) { put(hx - 8, hy + 3, M.B); put(hx - 7, hy + 3, M.B); put(hx + 9, hy + 3, M.B); put(hx + 10, hy + 3, M.B); }

    return { px: final, shadow: shadowE, pal: b.pal };
  }

  const ORDER = ["E", "F1", "F2", "F3", "C1", "C2", "C3", "I1", "I2", "L", "LC", "O", "OC", "K", "H", "N", "NH", "MO", "P", "B", "SH", "D3"];
  function draw(ctx, breed, pose, f, flags, scale, ox, oy) {
    const r = render(breed, pose, f, flags);
    const s = scale; ox = ox || 0; oy = oy || 0;
    // ground shadow
    ctx.fillStyle = "rgba(20,14,10,0.18)";
    const e = r.shadow;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (inEll(x, y, e)) ctx.fillRect(ox + x * s, oy + y * s, s, s);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const m = r.px[y * GW + x]; if (!m) continue;
      ctx.fillStyle = r.pal[ORDER[m]];
      ctx.fillRect(ox + x * s, oy + y * s, s, s);
    }
  }
  root.PixelDog = { draw, render, BREEDS, GW, GH };
})(typeof window !== "undefined" ? window : globalThis);

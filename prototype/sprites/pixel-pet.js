// Pixel pet sprite generator v2: dogs + cats, hue-shifted 5-tone ramps, selective outlines,
// hand-placed faces, secondary motion (ear lag, tail sway), fluffy edges.
(function (root) {
  const GW = 48, GH = 40;
  const LIGHT = (() => { const x = -0.55, y = -0.83, l = Math.hypot(x, y); return [x / l, y / l]; })();

  const COMMON = { K: "#1b1214", H: "#ffffff", S: "#d9e6ff", P: "#f07a8c", PD: "#7c2a3a", B: "#f6a0ae" };
  const BREEDS = {
    shiba: {
      name: "시바견", species: "dog", ears: "pointy", tail: "curl", socks: true, brows: true, muzzle: true, belly: true,
      pal: { F0: "#ffe3a8", F1: "#f9b96d", F2: "#e48b3c", F3: "#bf5f3a", F4: "#853b35",
             C0: "#ffffff", C1: "#fff7ea", C2: "#f3dfc6", C3: "#d4b39d", C4: "#a3807a",
             I1: "#f8c9bb", I2: "#df9893", O: "#371a1d", OL: "#6d3530", OC: "#6a4c49", OCL: "#9c7b6e",
             IR: "#8a4f33", N: "#2a1a1c", NH: "#8a6a6e", MO: "#6b4038" }
    },
    maltese: {
      name: "몰티즈", species: "dog", ears: "floppy", tail: "plume", socks: false, brows: false, muzzle: false, belly: false, fluffy: true,
      pal: { F0: "#ffffff", F1: "#ffffff", F2: "#f5f1ec", F3: "#ddd4d3", F4: "#b4a8b0",
             C0: "#ffffff", C1: "#ffffff", C2: "#f5f1ec", C3: "#ddd4d3", C4: "#b4a8b0",
             I1: "#f6d2cf", I2: "#e6b4b3", O: "#5e5260", OL: "#8f8290", OC: "#5e5260", OCL: "#8f8290",
             IR: "#6a4a42", N: "#241a1e", NH: "#7a6670", MO: "#8a7480" }
    },
    blacktan: {
      name: "블랙탄", species: "dog", ears: "pointy", tail: "curl", socks: true, brows: true, muzzle: true, belly: true,
      pal: { F0: "#9a8fa6", F1: "#6b6174", F2: "#443b4a", F3: "#2c2433", F4: "#1b1422",
             C0: "#ffeccd", C1: "#f3cf98", C2: "#d9a86b", C3: "#ad7a4f", C4: "#77503a",
             I1: "#d6a39b", I2: "#a87a78", O: "#0f0a14", OL: "#1f1726", OC: "#55392a", OCL: "#77503a",
             IR: "#7a5238", N: "#120c12", NH: "#5c5260", MO: "#5e3d2c" }
    },
    cheese: {
      name: "치즈 태비", species: "cat", ears: "cat", tail: "cat", socks: false, muzzle: true, belly: true, stripes: true,
      pal: { F0: "#ffe5b0", F1: "#fcc684", F2: "#eea158", F3: "#cd7444", F4: "#934a3d",
             C0: "#ffffff", C1: "#fff8ec", C2: "#f4e3cc", C3: "#d9bda4", C4: "#a98b80",
             I1: "#f9c6c4", I2: "#e3999c", O: "#3c1d1f", OL: "#7b4237", OC: "#6c4f4b", OCL: "#a3857a",
             IR: "#f4b63e", IR2: "#c47d22", Q: "#e9858e", MO: "#6b4038", WH: "#fff8ec" }
    },
    tuxedo: {
      name: "턱시도", species: "cat", ears: "cat", tail: "cat", socks: true, muzzle: true, belly: true, chest: true, bigMuzzle: true,
      pal: { F0: "#77718a", F1: "#524c62", F2: "#332e40", F3: "#221e2c", F4: "#15121d",
             C0: "#ffffff", C1: "#fbfbff", C2: "#e9e8f3", C3: "#c8c6d8", C4: "#9895ad",
             I1: "#e6a9b6", I2: "#b77d8c", O: "#0b0910", OL: "#1b1824", OC: "#5f5c75", OCL: "#8a87a0",
             IR: "#dcd84f", IR2: "#a7a22c", Q: "#f1a1ad", MO: "#6b5868", WH: "#ffffff" }
    },
    russian: {
      name: "러시안 블루", species: "cat", ears: "cat", tail: "cat", socks: false, muzzle: false, belly: false,
      pal: { F0: "#dbe3f1", F1: "#adb9cf", F2: "#8593ad", F3: "#64708e", F4: "#454d6c",
             C0: "#dbe3f1", C1: "#adb9cf", C2: "#8593ad", C3: "#64708e", C4: "#454d6c",
             I1: "#c9a7b8", I2: "#9f8299", O: "#232740", OL: "#3f4768", OC: "#232740", OCL: "#3f4768",
             IR: "#86d96f", IR2: "#4fa648", Q: "#7a6f8c", MO: "#343a58", WH: "#eef2fa" }
    }
  };

  // 고양이 눈: 크고 동그란 검은 눈 + 큰 반짝임 2칸 + 아래쪽에 살짝 비치는 홍채색
  const CFG = { catEyeX: [-7, 1], catEyeY: -3, catEye: [".KKK.", "KHHKK", "KHHKK", "KKKKK", "KIISK", ".KKK."], catNoseDy: 1 };

  /* ---------- shapes ---------- */
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

  /* ---------- pose building ---------- */
  function walkPhase(f) {
    const ph = f / 6 * Math.PI * 2;
    const bobOf = k => (Math.cos(2 * (k / 6 * Math.PI * 2)) > 0.3 ? 0 : -1);
    const bob = bobOf(f), hb = bobOf((f + 5) % 6), hbPrev = bobOf((f + 4) % 6);
    return {
      bob, hb, earTip: -(hb - hbPrev),
      Adx: 1.8 * Math.cos(ph), Al: Math.max(0, Math.sin(ph)) * 1.4,
      Bdx: -1.8 * Math.cos(ph), Bl: Math.max(0, -Math.sin(ph)) * 1.4,
      sway: Math.sin(ph)
    };
  }

  function headParts(B, hx, hy, add, o) {
    const dog = B.species === "dog";
    const head = dog ? { cx: hx, cy: hy, rx: 12, ry: 10.4 } : { cx: hx, cy: hy, rx: 11.4, ry: 9.4 };
    if (B.fluffy) { head.fluff = 0.035; head.lobes = 13; }
    const td = o.earTip || 0;
    const inset = (tri, k) => {
      const c = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3];
      return tri.map(p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k + 0.9]);
    };
    if (B.ears === "pointy" || B.ears === "cat") {
      const cat = B.ears === "cat";
      const far = cat ? [[hx - 11, hy - 2.5], [hx - 9.5, hy - 16 + td], [hx - 2.5, hy - 7.5]] : [[hx - 10.5, hy - 4], [hx - 8, hy - 15 + td], [hx - 2, hy - 8]];
      const near = cat ? [[hx + 2.5, hy - 7.5], [hx + 9.2, hy - 16.5 + td], [hx + 11.6, hy - 2.5]] : [[hx + 3, hy - 8.5], [hx + 9.5, hy - 15 + td], [hx + 11.5, hy - 3.5]];
      add({ g: "earF", z: 4, s: { t: "tri", p: far, se: { cx: hx - 7, cy: hy - 9, rx: 5, ry: 6 } }, inner: inset(far, 0.5), dark: true });
      add({ g: "earN", z: 4.1, s: { t: "tri", p: near, se: { cx: hx + 8, cy: hy - 9, rx: 5, ry: 6 } }, inner: inset(near, 0.5) });
    } else {
      add({ g: "earF", z: 4.5, s: { cx: hx - 11.4, cy: hy + 2.5 + td * 0.6, rx: 3.6, ry: 7.4, fluff: 0.08, lobes: 7 }, dark: true });
      add({ g: "earN", z: 4.6, s: { cx: hx + 11.9, cy: hy + 2.5 + td * 0.6, rx: 3.5, ry: 7.4, fluff: 0.08, lobes: 7, ph: 1 } });
    }
    const cream = [];
    if (B.muzzle) {
      if (dog) cream.push({ cx: hx + 2, cy: hy + 4.6, rx: 7.6, ry: 4.9 });
      else if (B.bigMuzzle) cream.push({ cx: hx + 0.5, cy: hy + 4.6, rx: 8.8, ry: 5.4 }, { cx: hx + 0.5, cy: hy - 3, rx: 1.4, ry: 6 });
      else cream.push({ cx: hx + 0.5, cy: hy + 5, rx: 7, ry: 4.2 });
    }
    add({ g: "head", z: 5, s: head, spec: true, rim: true, cream, stripeHead: B.stripes });
    if (!dog) {
      add({ g: "head", z: 5, s: { cx: hx - 8.6, cy: hy + 4, rx: 4.2, ry: 3.6, fluff: 0.12, lobes: 5 }, cream, rim: true });
      add({ g: "head", z: 5, s: { cx: hx + 9.2, cy: hy + 4, rx: 4.2, ry: 3.6, fluff: 0.12, lobes: 5, ph: 2 }, cream, rim: true });
    }
    return head;
  }

  function catTail(x0, y0, fn, n, z, B) {
    const c = [];
    for (let i = 0; i <= n; i++) { const t = i / n; const p = fn(t); c.push({ x: p[0], y: p[1], r: p[2] }); }
    return { g: "tail", z, s: { t: "chain", c }, rings: B.stripes };
  }

  function build(B, pose, f, flags) {
    const P = [];
    const add = o => P.push(o);
    const dog = B.species === "dog";
    let head, shadow;
    const leg = (cx, cy, rx, ry) => ({ cx, cy, rx, ry });

    if (pose === "walk") {
      const w = walkPhase(f);
      if (dog) {
        if (B.tail === "curl") add({ g: "tail", z: 0, s: { cx: 9.5 + w.sway * 0.8, cy: 18 + w.bob, rx: 4.8, ry: 4.6 }, cream: [{ cx: 10.3 + w.sway * 0.8, cy: 18.9 + w.bob, rx: 2.2, ry: 2.1 }] });
        else add({ g: "tail", z: 0, s: { cx: 9.5 + w.sway, cy: 17 + w.bob, rx: 3.9, ry: 5.6, fluff: 0.13, lobes: 7 } });
        add({ g: "legF", z: 1, s: leg(12 + w.Bdx, 33.6 - w.Bl, 2.7, 4.3), dark: true, sock: B.socks });
        add({ g: "legF", z: 1, s: leg(26 + w.Adx, 33.6 - w.Al, 2.7, 4.3), dark: true, sock: B.socks });
        add({ g: "body", z: 2, s: { cx: 19.5, cy: 27 + w.bob, rx: 11.5, ry: 7.6, fluff: B.fluffy ? 0.05 : 0, lobes: 11 }, rim: true, cream: B.belly ? [{ cx: 25, cy: 31.5 + w.bob, rx: 7, ry: 4.6 }] : [] });
        add({ g: "legN", z: 3, s: leg(16 + w.Adx, 34 - w.Al, 2.7, 4.3), sock: B.socks });
        add({ g: "legN2", z: 3.1, s: leg(29.5 + w.Bdx, 34 - w.Bl, 2.7, 4.3), sock: B.socks });
        head = headParts(B, 31, 15.5 + w.hb, add, { earTip: w.earTip });
        shadow = { cx: 21, cy: 38.6, rx: 15, ry: 1.6 };
      } else {
        add(catTail(0, 0, t => [9 - 3.5 * t + (3 + 2.6 * w.sway) * t * t, 24 + w.bob - 15 * t, 2.4 - 0.6 * t], 10, 0, B));
        add({ g: "legF", z: 1, s: leg(12 + w.Bdx, 33.4 - w.Bl, 2.2, 5), dark: true, sock: B.socks, stripes: B.stripes });
        add({ g: "legF", z: 1, s: leg(25.5 + w.Adx, 33.4 - w.Al, 2.2, 5), dark: true, sock: B.socks, stripes: B.stripes });
        add({ g: "body", z: 2, s: { cx: 19, cy: 27.5 + w.bob, rx: 11, ry: 6.4 }, rim: true, stripes: B.stripes,
              cream: B.belly ? [{ cx: 23, cy: 32 + w.bob, rx: 7.5, ry: B.chest ? 5 : 3.6 }] : [] });
        add({ g: "legN", z: 3, s: leg(15.5 + w.Adx, 33.8 - w.Al, 2.2, 5), sock: B.socks, stripes: B.stripes });
        add({ g: "legN2", z: 3.1, s: leg(28.5 + w.Bdx, 33.8 - w.Bl, 2.2, 5), sock: B.socks, stripes: B.stripes });
        head = headParts(B, 31, 16 + w.hb, add, { earTip: w.earTip });
        shadow = { cx: 20, cy: 38.6, rx: 14, ry: 1.5 };
      }
    } else if (pose === "sit") {
      const sway = f === 1 ? 0.7 : -0.5;
      if (dog) {
        if (B.tail === "curl") add({ g: "tail", z: 0, s: { cx: 9 + sway, cy: 25, rx: 4.8, ry: 4.6 }, cream: [{ cx: 9.8 + sway, cy: 25.9, rx: 2.2, ry: 2.1 }] });
        else add({ g: "tail", z: 0, s: { cx: 8.5 + sway, cy: 25, rx: 3.9, ry: 5.6, fluff: 0.13, lobes: 7 } });
        add({ g: "legF", z: 1, s: leg(24.5, 34, 2.4, 4.4), dark: true, sock: B.socks });
        add({ g: "body", z: 2, s: { cx: 21, cy: 28.5, rx: 9.2, ry: 8.6, fluff: B.fluffy ? 0.05 : 0, lobes: 11 }, rim: true, cream: B.belly ? [{ cx: 26.5, cy: 27, rx: 4.6, ry: 7 }] : [] });
        add({ g: "haunch", z: 2.5, s: { cx: 15.5, cy: 32, rx: 7, ry: 5.6, fluff: B.fluffy ? 0.05 : 0, lobes: 9 }, rim: true });
        add({ g: "foot", z: 3, s: { cx: 13.5, cy: 37, rx: 4.4, ry: 1.9 }, sock: B.socks, sockRows: 2 });
        add({ g: "legN", z: 3.2, s: leg(28.6, 34, 2.5, 4.6), sock: B.socks });
        head = headParts(B, 30.5, 15 + (flags.yawn ? -0.6 : 0), add, { earTip: flags.yawn ? 1 : 0 });
        shadow = { cx: 21, cy: 38.6, rx: 13, ry: 1.6 };
      } else {
        add({ g: "legF", z: 1, s: leg(24.2, 34, 2.1, 4.6), dark: true, sock: B.socks, stripes: B.stripes });
        add({ g: "body", z: 2, s: { cx: 21, cy: 29, rx: 8.2, ry: 8.4 }, rim: true, stripes: B.stripes, cream: B.belly ? [{ cx: 26, cy: 28, rx: 4.2, ry: B.chest ? 8 : 6.5 }] : [] });
        add({ g: "haunch", z: 2.5, s: { cx: 15.5, cy: 32.6, rx: 6.4, ry: 5.4 }, rim: true, stripes: B.stripes });
        add(catTail(0, 0, t => [12.5 - 7.5 * t, 37 - 9.5 * t * t * (1 + 0.15 * sway), 2.2 - 0.5 * t], 10, 2.7, B));
        add({ g: "foot", z: 3, s: { cx: 13, cy: 37.2, rx: 4, ry: 1.7 }, sock: B.socks, sockRows: 2 });
        add({ g: "legN", z: 3.2, s: leg(27.6, 34, 2.1, 4.6), sock: B.socks, stripes: B.stripes });
        head = headParts(B, 29.5, 15.5 + (flags.yawn ? -0.6 : 0), add, { earTip: flags.yawn ? 1 : 0 });
        shadow = { cx: 20, cy: 38.6, rx: 12, ry: 1.5 };
      }
    } else { // sleep
      const br = f === 1 ? 0.5 : 0;
      if (dog) {
        add({ g: "body", z: 2, s: { cx: 22, cy: 33 - br / 2, rx: 12.5, ry: 5.6 + br, fluff: B.fluffy ? 0.05 : 0, lobes: 11 }, rim: true });
        if (B.tail === "curl") add({ g: "tail", z: 2.6, s: { cx: 13, cy: 30.5 - br / 2, rx: 4.8, ry: 4.6 }, cream: [{ cx: 13.8, cy: 31.4 - br / 2, rx: 2.2, ry: 2.1 }] });
        else add({ g: "tail", z: 2.6, s: { cx: 13, cy: 31.5 - br / 2, rx: 5.5, ry: 3.4, fluff: 0.13, lobes: 7 } });
        head = headParts(B, 32.5, 28.5, add, { earTip: 1 });
        add({ g: "paw", z: 7, s: { cx: 39.5, cy: 37.2, rx: 4.2, ry: 1.8 }, sock: B.socks, sockRows: 2 });
        shadow = { cx: 23, cy: 38.8, rx: 17, ry: 1.5 };
      } else {
        add({ g: "body", z: 2, s: { cx: 21, cy: 33.2 - br / 2, rx: 12.5, ry: 5.6 + br }, rim: true, stripes: B.stripes });
        add(catTail(0, 0, t => [9 + 17 * t, 35.6 + 1.8 * t, 2.1 - 0.3 * t], 12, 2.6, B));
        head = headParts(B, 31.5, 29.5, add, { earTip: 1 });
        add({ g: "paw", z: 7, s: { cx: 38.5, cy: 37.4, rx: 3.6, ry: 1.6 }, sock: B.socks, sockRows: 2 });
        shadow = { cx: 23, cy: 38.8, rx: 16, ry: 1.5 };
      }
    }
    return { parts: P, head, shadow };
  }

  /* ---------- render ---------- */
  function render(key, pose, f, flags) {
    flags = flags || {};
    const B = BREEDS[key];
    const { parts, head, shadow } = build(B, pose, f, flags);
    parts.forEach((p, i) => { p._o = i; });
    parts.sort((a, b) => a.z - b.z || a._o - b._o);
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
            if (p.stripes && p.g === "body" || p.stripes && p.g === "haunch") stripe = ((x * 0.85 - y * 0.5) % 4.4 + 4.4) % 4.4 < 1.15 && y < p.s.cy + p.s.ry * 0.55;
            else if (p.stripes) stripe = y % 3 === 0;
            if (p.rings) stripe = nearestCircle(x, y, p.s.c) % 3 === 2;
            if (stripe) t = Math.min(4, t + 1);
          }
        }
        if (rp === "C" && t > 1) t -= 1; // 흰 털은 한 단계 밝게: 칙칙해 보이지 않도록
        ramp[k] = rp; tone[k] = t;
      }
    });

    // contour lines, cast shadow, rim light
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

    // outline: lighter on the lit (top/left) side
    const px = new Array(N).fill(null);
    for (let k = 0; k < N; k++) if (id[k] >= 0) px[k] = r2[k] === "I" ? "I" + t2[k] : r2[k] + t2[k];
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const k = y * GW + x;
      if (id[k] >= 0) continue;
      let nb = -1, lit = false;
      for (const [dx, dy, l] of [[0, 1, true], [1, 0, true], [0, -1, false], [-1, 0, false]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const kk = ny * GW + nx;
        if (id[kk] >= 0) { if (nb < 0) { nb = kk; lit = l; } }
      }
      if (nb >= 0) {
        const cream = r2[nb] === "C" || r2[nb] === "I";
        px[k] = cream ? (lit ? "OCL" : "OC") : (lit ? "OL" : "O");
      }
    }

    // face
    const hx = Math.round(head.cx), hy = Math.round(head.cy);
    const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < GW && y < GH) px[y * GW + x] = c; };
    const stamp = (x0, y0, rows) => rows.forEach((r, dy) => [...r].forEach((ch, dx) => {
      if (ch === ".") return;
      const map = { K: "K", H: "H", S: "S", I: "IR", J: "IR2", N: "N", n: "NH", Q: "Q", P: "P", D: "PD" };
      put(x0 + dx, y0 + dy, map[ch]);
    }));
    const dog = B.species === "dog";
    const closed = pose === "sleep" || flags.blink;
    // 강아지와 고양이 모두 크고 동그란 눈(5x6)을 쓴다
    const eyesX = dog ? [hx - 6, hx + 4] : CFG.catEyeX.map(d => hx + d);
    const ey = hy + CFG.catEyeY;
    eyesX.forEach((ex, idx) => {
      if (flags.yawn) {
        const o = 1;
        if (idx === 0) stamp(ex + o, ey + o, ["KK..", "..KK", "KK.."]); else stamp(ex, ey + o, ["..KK", "KK..", "..KK"]);
        stamp(ex, ey, []);
      } else if (closed) stamp(ex, ey + 2, ["K...K", ".KKK."]);
      else if (flags.happy) stamp(ex, ey + 2, [".KKK.", "K...K"]);
      else stamp(ex, ey, CFG.catEye);
    });
    if (dog && B.brows) eyesX.forEach(ex => { put(ex + 1, ey - 2, "C1"); put(ex + 2, ey - 2, "C1"); put(ex + 3, ey - 2, "C1"); });
    if (!dog && B.stripes) {
      [[hx - 2, hy - 7], [hx - 2, hy - 6], [hx, hy - 8], [hx, hy - 7], [hx, hy - 6], [hx + 2, hy - 7], [hx + 2, hy - 6],
       [hx - 10, hy + 2], [hx - 11, hy + 3], [hx + 10, hy + 2], [hx + 11, hy + 3]].forEach(([x, y]) => { if (px[y * GW + x] && px[y * GW + x][0] === "F") put(x, y, "F3"); });
    }
    const cx = dog ? hx + 1 : hx - 1, ny = hy + 2 + CFG.catNoseDy;
    if (dog) stamp(cx - 1, ny, ["NnN", "NNN", ".N."]);
    else stamp(cx - 1, ny, ["QQQ", ".Q."]);
    const my = dog ? ny + 3 : ny + 2;
    if (flags.yawn) stamp(cx - 1, my, ["DDD", "DPD", ".D."]);
    else {
      [[cx - 2, my], [cx - 1, my + 1], [cx, my], [cx + 1, my + 1], [cx + 2, my]].forEach(([x, y]) => put(x, y, "MO"));
      if (flags.happy && pose !== "sleep") { put(cx - 1, my + 2, "P"); put(cx, my + 2, "P"); put(cx + 1, my + 2, "P"); put(cx, my + 3, "P"); }
    }
    const blush = dog ? [hx - 9, hx + 10] : [hx - 8, hx + 6];
    blush.forEach(bx => { put(bx, hy + 2, "B"); put(bx + 1, hy + 2, "B"); });
    if (!dog) {
      const wy = hy + 3;
      [[hx - 10, wy], [hx - 11, wy], [hx - 12, wy], [hx - 13, wy - 1], [hx - 10, wy + 2], [hx - 11, wy + 2], [hx - 12, wy + 3], [hx - 13, wy + 3],
       [hx + 9, wy], [hx + 10, wy], [hx + 11, wy], [hx + 12, wy - 1], [hx + 9, wy + 2], [hx + 10, wy + 2], [hx + 11, wy + 3], [hx + 12, wy + 3]]
        .forEach(([x, y]) => put(x, y, "WH"));
    }
    return { px, shadow, pal: Object.assign({}, COMMON, B.pal) };
  }

  function draw(ctx, key, pose, f, flags, scale, ox, oy) {
    const r = render(key, pose, f, flags);
    const s = scale; ox = ox || 0; oy = oy || 0;
    ctx.fillStyle = "rgba(30,20,40,0.16)";
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (ellIn(x, y, r.shadow)) ctx.fillRect(ox + x * s, oy + y * s, s, s);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const c = r.px[y * GW + x];
      if (!c) continue;
      ctx.fillStyle = r.pal[c] || "#ff00ff";
      ctx.fillRect(ox + x * s, oy + y * s, s, s);
    }
  }
  root.PixelPet = { draw, render, BREEDS, GW, GH, CFG };
})(typeof window !== "undefined" ? window : globalThis);

// 스펙 + 동작 → 부위 목록. 부위: { g: 그룹, z: 그리는 순서, s: 도형, ...칠하기 옵션 }
function traitsOf(spec) {
  const has = k => (spec.pattern || []).includes(k);
  const shape = spec.shape || {};
  const tuxedo = has("tuxedo");
  return {
    species: spec.species,
    ears: spec.ears,
    tail: spec.tail === "long" ? "cat" : spec.tail,
    fluffy: !!spec.fluffy,
    socks: has("socks") || tuxedo,
    brows: has("brows"),
    muzzle: has("muzzle") || tuxedo,
    belly: has("belly") || tuxedo,
    stripes: has("stripes"),
    chest: !!shape.chest || tuxedo,
    bigMuzzle: !!shape.bigMuzzle || tuxedo,
    blaze: has("blaze")
  };
}

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
    else if (B.bigMuzzle) cream.push({ cx: hx + 0.5, cy: hy + 4.6, rx: 8.8, ry: 5.4 });
    else cream.push({ cx: hx + 0.5, cy: hy + 5, rx: 7, ry: 4.2 });
  }
  if (B.blaze) cream.push(dog ? { cx: hx + 1, cy: hy - 3, rx: 1.4, ry: 6 } : { cx: hx + 0.5, cy: hy - 3, rx: 1.4, ry: 6 });
  add({ g: "head", z: 5, s: head, spec: true, rim: true, cream });
  if (!dog) {
    add({ g: "head", z: 5, s: { cx: hx - 8.6, cy: hy + 4, rx: 4.2, ry: 3.6, fluff: 0.12, lobes: 5 }, cream, rim: true });
    add({ g: "head", z: 5, s: { cx: hx + 9.2, cy: hy + 4, rx: 4.2, ry: 3.6, fluff: 0.12, lobes: 5, ph: 2 }, cream, rim: true });
  }
  return head;
}

function catTail(fn, n, z, B) {
  const c = [];
  for (let i = 0; i <= n; i++) { const t = i / n; const p = fn(t); c.push({ x: p[0], y: p[1], r: p[2] }); }
  return { g: "tail", z, s: { t: "chain", c }, rings: B.stripes };
}

const leg = (cx, cy, rx, ry) => ({ cx, cy, rx, ry });

function walkParts(B, f, add) {
  const w = walkPhase(f);
  if (B.species === "dog") {
    if (B.tail === "curl") add({ g: "tail", z: 0, s: { cx: 9.5 + w.sway * 0.8, cy: 18 + w.bob, rx: 4.8, ry: 4.6 }, cream: [{ cx: 10.3 + w.sway * 0.8, cy: 18.9 + w.bob, rx: 2.2, ry: 2.1 }] });
    else add({ g: "tail", z: 0, s: { cx: 9.5 + w.sway, cy: 17 + w.bob, rx: 3.9, ry: 5.6, fluff: 0.13, lobes: 7 } });
    add({ g: "legF", z: 1, s: leg(12 + w.Bdx, 33.6 - w.Bl, 2.7, 4.3), dark: true, sock: B.socks });
    add({ g: "legF", z: 1, s: leg(26 + w.Adx, 33.6 - w.Al, 2.7, 4.3), dark: true, sock: B.socks });
    add({ g: "body", z: 2, s: { cx: 19.5, cy: 27 + w.bob, rx: 11.5, ry: 7.6, fluff: B.fluffy ? 0.05 : 0, lobes: 11 }, rim: true, cream: B.belly ? [{ cx: 25, cy: 31.5 + w.bob, rx: 7, ry: 4.6 }] : [] });
    add({ g: "legN", z: 3, s: leg(16 + w.Adx, 34 - w.Al, 2.7, 4.3), sock: B.socks });
    add({ g: "legN2", z: 3.1, s: leg(29.5 + w.Bdx, 34 - w.Bl, 2.7, 4.3), sock: B.socks });
    return { head: headParts(B, 31, 15.5 + w.hb, add, { earTip: w.earTip }), shadow: { cx: 21, cy: 38.6, rx: 15, ry: 1.6 } };
  }
  add(catTail(t => [9 - 3.5 * t + (3 + 2.6 * w.sway) * t * t, 24 + w.bob - 15 * t, 2.4 - 0.6 * t], 10, 0, B));
  add({ g: "legF", z: 1, s: leg(12 + w.Bdx, 33.4 - w.Bl, 2.2, 5), dark: true, sock: B.socks, stripes: B.stripes });
  add({ g: "legF", z: 1, s: leg(25.5 + w.Adx, 33.4 - w.Al, 2.2, 5), dark: true, sock: B.socks, stripes: B.stripes });
  add({ g: "body", z: 2, s: { cx: 19, cy: 27.5 + w.bob, rx: 11, ry: 6.4 }, rim: true, stripes: B.stripes,
        cream: B.belly ? [{ cx: 23, cy: 32 + w.bob, rx: 7.5, ry: B.chest ? 5 : 3.6 }] : [] });
  add({ g: "legN", z: 3, s: leg(15.5 + w.Adx, 33.8 - w.Al, 2.2, 5), sock: B.socks, stripes: B.stripes });
  add({ g: "legN2", z: 3.1, s: leg(28.5 + w.Bdx, 33.8 - w.Bl, 2.2, 5), sock: B.socks, stripes: B.stripes });
  return { head: headParts(B, 31, 16 + w.hb, add, { earTip: w.earTip }), shadow: { cx: 20, cy: 38.6, rx: 14, ry: 1.5 } };
}

function sitParts(B, f, flags, add, o = {}) {
  const sway = f === 1 ? 0.7 : -0.5;
  // 시무룩: 머리를 조금 숙이고 귀 끝과 꼬리를 늘어뜨린다
  const lift = (flags.yawn ? -0.6 : 0) + (flags.sad ? 1 : 0) + (o.headDy || 0);
  const earTip = (flags.yawn ? 1 : 0) + (flags.sad ? 3 : 0) + (o.earTip || 0);
  const hdx = o.headDx || 0, tdy = (o.tailDy || 0) + (flags.sad ? 3 : 0);
  if (B.species === "dog") {
    if (B.tail === "curl") add({ g: "tail", z: 0, s: { cx: 9 + sway, cy: 25 + tdy, rx: 4.8, ry: 4.6 }, cream: [{ cx: 9.8 + sway, cy: 25.9 + tdy, rx: 2.2, ry: 2.1 }] });
    else add({ g: "tail", z: 0, s: { cx: 8.5 + sway, cy: 25 + tdy, rx: 3.9, ry: 5.6, fluff: 0.13, lobes: 7 } });
    add({ g: "legF", z: 1, s: leg(24.5, 34, 2.4, 4.4), dark: true, sock: B.socks });
    add({ g: "body", z: 2, s: { cx: 21, cy: 28.5, rx: 9.2, ry: 8.6, fluff: B.fluffy ? 0.05 : 0, lobes: 11 }, rim: true, cream: B.belly ? [{ cx: 26.5, cy: 27, rx: 4.6, ry: 7 }] : [] });
    add({ g: "haunch", z: 2.5, s: { cx: 15.5, cy: 32, rx: 7, ry: 5.6, fluff: B.fluffy ? 0.05 : 0, lobes: 9 }, rim: true });
    add({ g: "foot", z: 3, s: { cx: 13.5, cy: 37, rx: 4.4, ry: 1.9 }, sock: B.socks, sockRows: 2 });
    add({ g: "legN", z: 3.2, s: leg(28.6, 34, 2.5, 4.6), sock: B.socks });
    return { head: headParts(B, 30.5 + hdx, 15 + lift, add, { earTip }), shadow: { cx: 21, cy: 38.6, rx: 13, ry: 1.6 } };
  }
  add({ g: "legF", z: 1, s: leg(24.2, 34, 2.1, 4.6), dark: true, sock: B.socks, stripes: B.stripes });
  add({ g: "body", z: 2, s: { cx: 21, cy: 29, rx: 8.2, ry: 8.4 }, rim: true, stripes: B.stripes, cream: B.belly ? [{ cx: 26, cy: 28, rx: 4.2, ry: B.chest ? 8 : 6.5 }] : [] });
  add({ g: "haunch", z: 2.5, s: { cx: 15.5, cy: 32.6, rx: 6.4, ry: 5.4 }, rim: true, stripes: B.stripes });
  add(catTail(t => [12.5 - 7.5 * t, 37 - 9.5 * t * t * (1 + 0.15 * sway) * (tdy ? 0.4 : 1), 2.2 - 0.5 * t], 10, 2.7, B));
  add({ g: "foot", z: 3, s: { cx: 13, cy: 37.2, rx: 4, ry: 1.7 }, sock: B.socks, sockRows: 2 });
  add({ g: "legN", z: 3.2, s: leg(27.6, 34, 2.1, 4.6), sock: B.socks, stripes: B.stripes });
  return { head: headParts(B, 29.5 + hdx, 15.5 + lift, add, { earTip }), shadow: { cx: 20, cy: 38.6, rx: 12, ry: 1.5 } };
}

function sleepParts(B, f, add) {
  const br = f === 1 ? 0.5 : 0;
  if (B.species === "dog") {
    add({ g: "body", z: 2, s: { cx: 22, cy: 33 - br / 2, rx: 12.5, ry: 5.6 + br, fluff: B.fluffy ? 0.05 : 0, lobes: 11 }, rim: true });
    if (B.tail === "curl") add({ g: "tail", z: 2.6, s: { cx: 13, cy: 30.5 - br / 2, rx: 4.8, ry: 4.6 }, cream: [{ cx: 13.8, cy: 31.4 - br / 2, rx: 2.2, ry: 2.1 }] });
    else add({ g: "tail", z: 2.6, s: { cx: 13, cy: 31.5 - br / 2, rx: 5.5, ry: 3.4, fluff: 0.13, lobes: 7 } });
    const head = headParts(B, 32.5, 28.5, add, { earTip: 1 });
    add({ g: "paw", z: 7, s: { cx: 39.5, cy: 37.2, rx: 4.2, ry: 1.8 }, sock: B.socks, sockRows: 2 });
    return { head, shadow: { cx: 23, cy: 38.8, rx: 17, ry: 1.5 } };
  }
  add({ g: "body", z: 2, s: { cx: 21, cy: 33.2 - br / 2, rx: 12.5, ry: 5.6 + br }, rim: true, stripes: B.stripes });
  add(catTail(t => [9 + 17 * t, 35.6 + 1.8 * t, 2.1 - 0.3 * t], 12, 2.6, B));
  const head = headParts(B, 31.5, 29.5, add, { earTip: 1 });
  add({ g: "paw", z: 7, s: { cx: 38.5, cy: 37.4, rx: 3.6, ry: 1.6 }, sock: B.socks, sockRows: 2 });
  return { head, shadow: { cx: 23, cy: 38.8, rx: 16, ry: 1.5 } };
}


// 서 있는 몸을 조정값으로 그린다. 다리 순서: 먼 뒷다리, 먼 앞다리, 가까운 뒷다리, 가까운 앞다리.
// o = { bodyDy, bodyRx, bodyRy, headDx, headDy, earTip, tailDx, tailDy, sway, legs: [{dx,dy,rx,ry}] x4, shadowRx }
function standParts(B, add, o = {}) {
  const dog = B.species === "dog";
  const L = o.legs || [{}, {}, {}, {}];
  const bdy = o.bodyDy || 0, sway = o.sway || 0;
  const legBase = dog
    ? [[12, 33.6], [26, 33.6], [16, 34], [29.5, 34]]
    : [[12, 33.4], [25.5, 33.4], [15.5, 33.8], [28.5, 33.8]];
  const [lrx, lry] = dog ? [2.7, 4.3] : [2.2, 5];
  const legOf = i => leg(legBase[i][0] + (L[i].dx || 0), legBase[i][1] + (L[i].dy || 0), L[i].rx || lrx, L[i].ry || lry);
  const tdx = o.tailDx || 0, tdy = o.tailDy || 0;
  if (dog) {
    if (B.tail === "curl") add({ g: "tail", z: 0, s: { cx: 9.5 + tdx + sway * 0.8, cy: 18 + bdy + tdy, rx: 4.8, ry: 4.6 }, cream: [{ cx: 10.3 + tdx + sway * 0.8, cy: 18.9 + bdy + tdy, rx: 2.2, ry: 2.1 }] });
    else add({ g: "tail", z: 0, s: { cx: 9.5 + tdx + sway, cy: 17 + bdy + tdy, rx: 3.9, ry: 5.6, fluff: 0.13, lobes: 7 } });
  } else {
    add(catTail(t => [9 + tdx - 3.5 * t + (3 + 2.6 * sway) * t * t, 24 + bdy + tdy - 15 * t * (o.tailLen || 1), 2.4 - 0.6 * t], 10, 0, B));
  }
  const st = dog ? {} : { stripes: B.stripes };
  add({ g: "legF", z: 1, s: legOf(0), dark: true, sock: B.socks, ...st });
  add({ g: "legF", z: 1, s: legOf(1), dark: true, sock: B.socks, ...st });
  const body = dog
    ? { cx: 19.5, cy: 27 + bdy, rx: (o.bodyRx || 1) * 11.5, ry: (o.bodyRy || 1) * 7.6, fluff: B.fluffy ? 0.05 : 0, lobes: 11 }
    : { cx: 19, cy: 27.5 + bdy, rx: (o.bodyRx || 1) * 11, ry: (o.bodyRy || 1) * 6.4 };
  const belly = dog ? { cx: 25, cy: 31.5 + bdy, rx: 7, ry: 4.6 } : { cx: 23, cy: 32 + bdy, rx: 7.5, ry: B.chest ? 5 : 3.6 };
  add({ g: "body", z: 2, s: body, rim: true, ...st, cream: B.belly ? [belly] : [] });
  add({ g: "legN", z: 3, s: legOf(2), sock: B.socks, ...st });
  add({ g: "legN2", z: 3.1, s: legOf(3), sock: B.socks, ...st });
  const head = headParts(B, 31 + (o.headDx || 0), (dog ? 15.5 : 16) + (o.headDy || 0), add, { earTip: o.earTip || 0 });
  return { head, shadow: { cx: 21, cy: 38.6, rx: o.shadowRx || 15, ry: 1.6 } };
}

const crouch = { bodyDy: 2, headDy: 2.5, headDx: 0.5, tailDy: 2,
  legs: [{ dx: -1, dy: 1.3, ry: 3 }, { dy: 1, ry: 3.3 }, { dx: -1, dy: 1.3, ry: 3 }, { dy: 1, ry: 3.3 }] };

const POSE_EXTRA = {
  crouch: (B, f, flags, add) => standParts(B, add, crouch),
  air: (B, f, flags, add) => f === 0
    ? standParts(B, add, { earTip: 1, tailDy: 2, sway: -0.6, shadowRx: 9,
        legs: [{ dx: -2.5, dy: -2, ry: 2.8 }, { dx: 1.5, dy: -2.6, ry: 2.8 }, { dx: -2.5, dy: -2, ry: 2.8 }, { dx: 1.5, dy: -2.6, ry: 2.8 }] })
    : standParts(B, add, { sway: 0.6, shadowRx: 9,
        legs: [{ dx: -3, dy: -1.5, ry: 3.5 }, { dx: 3, ry: 4.3 }, { dx: -3, dy: -1.5, ry: 3.5 }, { dx: 3, ry: 4.3 }] }),
  land: (B, f, flags, add) => standParts(B, add, { bodyDy: 1.5, bodyRx: 1.08, bodyRy: 0.85, headDy: 2.5, earTip: 1, shadowRx: 17,
    legs: [{ dx: -1, dy: 1, ry: 3 }, { dx: 1, dy: 1, ry: 3 }, { dx: -1, dy: 1, ry: 3 }, { dx: 1, dy: 1, ry: 3 }] }),
  fall: (B, f, flags, add) => {
    const r = standParts(B, add, { headDy: -1, tailDy: -2, sway: 1, shadowRx: 9,
      legs: [{ dx: -3.5, dy: -2.1, ry: 3.8 }, { dx: 3.5, dy: -2.1, ry: 3.8 }, { dx: -3.5, dy: -2.5, ry: 3.8 }, { dx: 3.5, dy: -2.5, ry: 3.8 }] });
    return { ...r, face: { eyes: "open", mouth: "o" } };
  },
  held: (B, f, flags, add) => {
    const dog = B.species === "dog";
    const sw = f === 1 ? 1 : 0;
    if (dog) {
      if (B.tail === "curl") add({ g: "tail", z: 0, s: { cx: 14, cy: 31, rx: 4.2, ry: 4 }, cream: [{ cx: 14.7, cy: 31.8, rx: 2, ry: 1.9 }] });
      else add({ g: "tail", z: 0, s: { cx: 14, cy: 32, rx: 3.4, ry: 5, fluff: 0.13, lobes: 7 } });
    } else {
      add(catTail(t => [16 - 3 * t + sw * t, 31 + 7 * t, 2.2 - 0.5 * t], 8, 0, B));
    }
    // 목덜미를 잡힌 모습: 몸이 세로로 늘어지고 네 다리가 아래로 대롱거린다
    const lr = dog ? 2.4 : 2;
    add({ g: "legF", z: 1, s: leg(20, 35 + sw, lr, 4.2), dark: true, sock: B.socks });
    add({ g: "legF", z: 1, s: leg(26.5, 34.5 - sw, lr, 4.2), dark: true, sock: B.socks });
    add({ g: "body", z: 2, s: { cx: 23, cy: 28, rx: 6.6, ry: 8.6, fluff: B.fluffy ? 0.05 : 0, lobes: 11 }, rim: true, cream: B.belly ? [{ cx: 24.5, cy: 30.5, rx: 3.8, ry: 5.5 }] : [] });
    add({ g: "legN", z: 3, s: leg(18.5, 35.5 - sw, lr, 4.2), sock: B.socks });
    add({ g: "legN2", z: 3.1, s: leg(28, 35 + sw, lr, 4.2), sock: B.socks });
    const head = headParts(B, 26, 16, add, { earTip: 1 });
    return { head, shadow: { cx: 24, cy: 38.8, rx: 0.1, ry: 0.1 } };
  },
  lookdown: (B, f, flags, add) => sitParts(B, 0, {}, add, { headDx: 2, headDy: 2.5, earTip: 1 }),
  stretch: (B, f, flags, add) => {
    if (f === 1) return standParts(B, add, {});
    const dog = B.species === "dog";
    if (dog) {
      if (B.tail === "curl") add({ g: "tail", z: 0, s: { cx: 6.5, cy: 15, rx: 4.6, ry: 4.4 }, cream: [{ cx: 7.2, cy: 15.8, rx: 2.1, ry: 2 }] });
      else add({ g: "tail", z: 0, s: { cx: 6.5, cy: 14, rx: 3.6, ry: 5.4, fluff: 0.13, lobes: 7 } });
    } else {
      add(catTail(t => [8 - 2 * t + 3 * t * t, 21 - 14 * t, 2.3 - 0.6 * t], 10, 0, B));
    }
    const lr = dog ? 2.7 : 2.2;
    add({ g: "legF", z: 1, s: leg(11, 32.5, lr, 5.4), dark: true, sock: B.socks });
    add({ g: "legF", z: 1, s: leg(31, 37, 5, 1.8), dark: true, sock: B.socks, sockRows: 2 });
    add({ g: "body", z: 2, s: { cx: 14.5, cy: 25, rx: 8, ry: 7, fluff: B.fluffy ? 0.05 : 0, lobes: 9 }, rim: true });
    add({ g: "body", z: 2, s: { cx: 24, cy: 30.5, rx: 8.5, ry: 6, fluff: B.fluffy ? 0.05 : 0, lobes: 9 }, rim: true, cream: B.belly ? [{ cx: 27, cy: 33.5, rx: 5, ry: 3 }] : [] });
    add({ g: "legN", z: 3, s: leg(15, 33, lr, 5), sock: B.socks });
    add({ g: "legN2", z: 3.1, s: leg(34, 37.2, 5, 1.8), sock: B.socks, sockRows: 2 });
    const head = headParts(B, 34, 23, add, { earTip: 1 });
    return { head, shadow: { cx: 22, cy: 38.6, rx: 16, ry: 1.6 }, face: { eyes: "closed", mouth: "smile" } };
  },
  roll: (B, f, flags, add) => {
    const dog = B.species === "dog";
    const w = f === 1 ? 1 : -1;
    const lr = dog ? 2.6 : 2.1;
    add({ g: "legF", z: 1, s: leg(17 - w * 0.6, 23 + w * 0.5, lr, 3.8), dark: true, sock: B.socks });
    add({ g: "legF", z: 1, s: leg(27 + w * 0.6, 23 - w * 0.5, lr, 3.8), dark: true, sock: B.socks });
    add({ g: "body", z: 2, s: { cx: 22, cy: 32.5, rx: 12, ry: 6, fluff: B.fluffy ? 0.05 : 0, lobes: 11 }, rim: true, cream: B.belly ? [{ cx: 22, cy: 29.5, rx: 8, ry: 3 }] : [] });
    if (dog) {
      if (B.tail === "curl") add({ g: "tail", z: 2.6, s: { cx: 9.5, cy: 34, rx: 4, ry: 3.8 }, cream: [{ cx: 10.2, cy: 34.7, rx: 1.9, ry: 1.8 }] });
      else add({ g: "tail", z: 2.6, s: { cx: 9, cy: 35, rx: 4.8, ry: 3, fluff: 0.13, lobes: 7 } });
    } else {
      add(catTail(t => [11 - 6 * t, 36 - 2 * t + w * t, 2.1 - 0.4 * t], 8, 2.6, B));
    }
    add({ g: "legN", z: 3, s: leg(14.5 + w * 0.6, 23.5 - w * 0.5, lr, 3.8), sock: B.socks });
    add({ g: "legN2", z: 3.1, s: leg(24.5 - w * 0.6, 23.2 + w * 0.5, lr, 3.8), sock: B.socks });
    const head = headParts(B, 33.5, 29, add, { earTip: 1 });
    return { head, shadow: { cx: 23, cy: 38.8, rx: 17, ry: 1.5 }, face: { eyes: "happy", mouth: "smile", tongue: true } };
  },
  // 꼬리 잡기: 서 있기와 웅크리기를 좌우로 뒤집어 가며 제자리에서 도는 것처럼 보이게 한다.
  chase: (B, f, flags, add) => {
    const r = f % 2 === 0 ? standParts(B, add, { sway: 1, tailDx: 1 }) : standParts(B, add, { ...crouch, headDx: -1.5 });
    return { ...r, flip: f >= 2, face: { eyes: "happy", mouth: "smile" } };
  }
};

const POSE_BUILDERS = {
  walk: (B, f, flags, add) => walkParts(B, f, add),
  sit: (B, f, flags, add) => sitParts(B, f, flags, add),
  sleep: (B, f, flags, add) => sleepParts(B, f, add),
  ...POSE_EXTRA
};

function buildParts(spec, pose, f, flags) {
  const B = traitsOf(spec);
  const builder = POSE_BUILDERS[pose];
  if (!builder) throw new Error(`unknown pose: ${pose}`);
  const parts = [];
  const { head, shadow, face, flip } = builder(B, f, flags || {}, p => parts.push(p));
  return { parts, head, shadow, face, flip: !!flip, traits: B };
}

module.exports = { traitsOf, buildParts, POSE_BUILDERS, headParts, catTail, walkPhase, leg };

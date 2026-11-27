// AI 캐릭터 시트(초록 배경) → 앱 그림 묶음(src/sprites/packs/<id>.json)
// 실행: node tools/import-pack.js tools/packs/shiba-gemini.json
// 1) 초록 배경 지우기 2) 칸 자르기 3) 몸에서 떨어진 작은 조각(효과선·반짝이) 지우기
// 4) 도트 한 칸 크기(sourceScale)로 다시 찍기 5) 발 높이·가운데 맞추기 6) 색 수 줄이기(모든 그림 같은 팔레트)
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

async function main() {
  const cfgPath = process.argv[2];
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const root = path.join(__dirname, "..");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const sheets = {};
  for (const [id, s] of Object.entries(cfg.sheets)) sheets[id] = { ...s, url: "data:image/png;base64," + fs.readFileSync(path.join(root, s.file)).toString("base64") };
  const pack = await page.evaluate(processAll, { cfg, sheets });
  await browser.close();
  const out = path.join(root, "src", "sprites", "packs", cfg.id + ".json");
  fs.writeFileSync(out, JSON.stringify(pack));
  console.log(`${out}: ${Object.keys(pack.frames).length} frames, ${pack.palette.length} colors`);
}

// 브라우저 안에서 실행된다.
async function processAll({ cfg, sheets }) {
  const { cols, rows, baseRow, sourceScale: s } = cfg;
  // 초록이 빨강·파랑보다 뚜렷하게 강하면 배경(털 가장자리에 섞인 초록 테두리 포함). 털·크림·보라 그림자는 빨강이 초록 이상이다.
  const isBg = (r, g, b) => g - r > 12 && g - b > 12;

  async function load(url) {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data };
  }

  function cutCell(im, grid, index) {
    const [gc, gr] = grid, cw = Math.floor(im.w / gc), ch = Math.floor(im.h / gr);
    const cx = (index % gc) * cw, cy = Math.floor(index / gc) * ch;
    const rgba = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = ((cy + y) * im.w + cx + x) * 4, o = (y * cw + x) * 4;
      const r = im.d[i], g = im.d[i + 1], b = im.d[i + 2];
      if (isBg(r, g, b)) continue;
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = 255;
    }
    return { w: cw, h: ch, rgba };
  }

  // 가장 큰 덩어리의 10%보다 작은 조각은 지운다(효과선, 반짝이, 옆 칸에서 넘어온 부스러기).
  function keepMain(cell) {
    const { w, h, rgba } = cell, label = new Int32Array(w * h).fill(-1), sizes = [];
    for (let i = 0; i < w * h; i++) {
      if (!rgba[i * 4 + 3] || label[i] >= 0) continue;
      const id = sizes.length, stack = [i]; label[i] = id; let n = 0;
      while (stack.length) {
        const k = stack.pop(); n++;
        const x = k % w, y = (k - x) / w;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const kk = ny * w + nx;
          if (rgba[kk * 4 + 3] && label[kk] < 0) { label[kk] = id; stack.push(kk); }
        }
      }
      sizes.push(n);
    }
    const max = Math.max(0, ...sizes);
    for (let i = 0; i < w * h; i++) if (label[i] >= 0 && sizes[label[i]] < max * 0.1) rgba[i * 4 + 3] = 0;
    return cell;
  }

  // 도트 한 칸(s×s) 안에서 가장 흔한 색으로 다시 찍는다. 발 끝을 baseRow에, 가로 가운데를 cols/2에 맞춘다.
  function resample(cell, flip) {
    const { w, h, rgba } = cell;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const out = new Array(cols * rows).fill(null);
    if (x1 < 0) return out;
    const midX = (x0 + x1 + 1) / 2;
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
      const sx = midX + (gx - cols / 2) * s, sy = y1 + 1 - (baseRow + 1 - gy) * s;
      const counts = new Map(); let opaque = 0, total = 0;
      for (let yy = Math.floor(sy); yy < Math.floor(sy + s); yy++) for (let xx = Math.floor(sx); xx < Math.floor(sx + s); xx++) {
        total++;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const i = (yy * w + xx) * 4;
        if (!rgba[i + 3]) continue;
        opaque++;
        const key = ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3);
        const c = counts.get(key) || [0, 0, 0, 0];
        c[0]++; c[1] += rgba[i]; c[2] += rgba[i + 1]; c[3] += rgba[i + 2];
        counts.set(key, c);
      }
      if (opaque < total * 0.5) continue;
      let best = null; for (const c of counts.values()) if (!best || c[0] > best[0]) best = c;
      out[gy * cols + (flip ? cols - 1 - gx : gx)] = [best[1] / best[0], best[2] / best[0], best[3] / best[0]];
    }
    return out;
  }

  const images = {};
  for (const [id, sh] of Object.entries(sheets)) images[id] = await load(sh.url);
  const raw = {};
  for (const [key, [sheet, index, opts]] of Object.entries(cfg.frames)) {
    raw[key] = resample(keepMain(cutCell(images[sheet], sheets[sheet].grid, index)), opts && opts.flip);
  }

  // 팔레트: 기준 시트 그림들의 색을 k-평균으로 모은다. 모든 그림을 이 팔레트로 칠해 색을 통일한다.
  const sample = [];
  for (const [key, [sheet]] of Object.entries(cfg.frames)) if (cfg.paletteFrom.includes(sheet)) for (const c of raw[key]) if (c) sample.push(c);
  const k = cfg.paletteSize;
  const lum = c => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  sample.sort((a, b) => lum(a) - lum(b));
  let centers = Array.from({ length: k }, (_, i) => sample[Math.floor((i + 0.5) * sample.length / k)].slice());
  const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const nearest = c => { let bi = 0, bd = Infinity; centers.forEach((m, i) => { const d = dist(c, m); if (d < bd) { bd = d; bi = i; } }); return bi; };
  for (let it = 0; it < 12; it++) {
    const acc = centers.map(() => [0, 0, 0, 0]);
    for (const c of sample) { const i = nearest(c); acc[i][0] += c[0]; acc[i][1] += c[1]; acc[i][2] += c[2]; acc[i][3]++; }
    centers = centers.map((m, i) => (acc[i][3] ? [acc[i][0] / acc[i][3], acc[i][1] / acc[i][3], acc[i][2] / acc[i][3]] : m));
  }
  const hex = c => "#" + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
  const palette = centers.map(hex);
  const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
  const frames = {};
  for (const [key, px] of Object.entries(raw)) frames[key] = px.map(c => (c ? digits[nearest(c)] : ".")).join("");
  return { id: cfg.id, cols, rows, baseRow, palette, frames };
}

main().catch(e => { console.error(e); process.exit(1); });

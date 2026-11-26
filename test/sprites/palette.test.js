const test = require("node:test");
const assert = require("node:assert");
const { rampFromColor, buildPalette } = require("../../src/sprites/palette.js");
const { PRESETS } = require("../../src/sprites/presets.js");
const { renderFrame } = require("../../src/sprites/render.js");

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

test("ramp steps get darker from 0 to 4", () => {
  for (const c of ["#e48b3c", "#f5f1ec", "#443b4a", "#8593ad"]) {
    const r = rampFromColor(c);
    for (let i = 0; i < 4; i++) assert.ok(luminance(r[i]) > luminance(r[i + 1]), `${c} step ${i} > ${i + 1}: ${r[i]} vs ${r[i + 1]}`);
  }
});

test("ramp step 2 is the input color", () => {
  assert.strictEqual(rampFromColor("#e48b3c")[2], "#e48b3c");
});

test("an explicit palette wins over automatic colors", () => {
  assert.strictEqual(buildPalette(PRESETS.find(p => p.id === "shiba").spec).F3, "#bf5f3a");
});

test("a single-color coat uses the main ramp for white fur", () => {
  const pal = buildPalette({ species: "cat", ears: "cat", tail: "long", pattern: [], fluffy: false, colors: { main: "#8593ad", second: null }, eye: "#86d96f" });
  assert.strictEqual(pal.C2, pal.F2);
});

test("automatic palettes define every color key the renderer uses", () => {
  const keys = ["F0", "F1", "F2", "F3", "F4", "C0", "C1", "C2", "C3", "C4", "I1", "I2", "O", "OL", "OC", "OCL", "IR", "IR2", "N", "NH", "Q", "MO", "WH", "K", "H", "S", "P", "PD", "B"];
  const pal = buildPalette({ species: "dog", ears: "pointy", tail: "curl", pattern: [], fluffy: false, colors: { main: "#e48b3c", second: "#f3dfc6" }, eye: "#8a4f33" });
  for (const k of keys) assert.match(pal[k] || "", /^#[0-9a-f]{6}$/, k);
});

test("there are twelve presets, six dogs and six cats, with unique ids", () => {
  assert.strictEqual(PRESETS.length, 12);
  assert.strictEqual(PRESETS.filter(p => p.spec.species === "dog").length, 6);
  assert.strictEqual(PRESETS.filter(p => p.spec.species === "cat").length, 6);
  assert.strictEqual(new Set(PRESETS.map(p => p.id)).size, 12);
  for (const p of PRESETS) assert.ok(p.name.ko && p.name.en, p.id);
});

test("every preset renders every base pose with only defined colors", () => {
  for (const p of PRESETS) for (const [pose, f] of [["walk", 0], ["walk", 3], ["sit", 0], ["sleep", 1]]) {
    const r = renderFrame(p.spec, pose, f, {});
    assert.ok(r.px.every(c => c === null || /^#[0-9a-f]{6}$/.test(c)), `${p.id} ${pose}`);
  }
});

test("a dark-coated cat shows a wide colored iris so its eyes stay visible", () => {
  const spec = PRESETS.find(p => p.id === "black").spec;
  const r = renderFrame(spec, "sit", 0, {});
  const iris = r.px.filter(c => c === buildPalette(spec).IR).length;
  assert.ok(iris >= 12, `iris pixels: ${iris}`);
});

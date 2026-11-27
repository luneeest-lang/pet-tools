const test = require("node:test");
const assert = require("node:assert");
const { PRESETS } = require("../../src/sprites/presets.js");
const { FRAME_LIST, renderAllFrames } = require("../../src/sprites/frames.js");
const { geometryOf, screenGeometry } = require("../../src/sprites/geometry.js");

const shiba = PRESETS.find(p => p.id === "shiba").spec;
const russian = PRESETS.find(p => p.id === "russian").spec;

test("the shiba preset uses the Gemini pack for every frame", () => {
  assert.strictEqual(shiba.pack, "shiba-gemini");
  const all = renderAllFrames(shiba);
  for (const f of FRAME_LIST) {
    const fr = all.get(f.key);
    assert.ok(fr, f.key);
    assert.deepStrictEqual([fr.w, fr.h, fr.px.length, fr.shadow.length], [96, 80, 7680, 7680], f.key);
    assert.ok(fr.px.every(c => c === null || /^#[0-9a-f]{6}$/.test(c)), f.key);
    assert.ok(fr.px.filter(Boolean).length > 1500, `${f.key} painted`);
  }
});

test("geometry: procedural pets keep 48x40, pack pets use the pack's grid", () => {
  assert.deepStrictEqual(geometryOf(russian), { cols: 48, rows: 40, baseRow: 38, halfW: 22, hangDrop: 17, edgeIn: 8, hopOut: 30 });
  const g = geometryOf(shiba);
  assert.deepStrictEqual([g.cols, g.rows, g.baseRow], [96, 80, 78]);
  assert.ok(g.halfW > 20 && g.halfW < 48, `halfW ${g.halfW}`);
  assert.ok(g.hangDrop > 30 && g.hangDrop < 70, `hangDrop ${g.hangDrop}`);
});

test("screen geometry: pack art is drawn at whole-pixel sizes", () => {
  assert.strictEqual(screenGeometry(russian, 3).px, 3);
  assert.deepStrictEqual([2, 3, 4].map(s => screenGeometry(shiba, s).px), [1, 2, 3]);
  const sg = screenGeometry(shiba, 3);
  assert.deepStrictEqual([sg.w, sg.h, sg.footPad], [192, 160, 4]);
  assert.strictEqual(screenGeometry(russian, 3).footPad, 6);
});

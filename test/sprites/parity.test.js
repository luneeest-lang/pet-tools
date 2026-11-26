const test = require("node:test");
const assert = require("node:assert");
require("../../prototype/sprites/pixel-pet.js");
const { renderFrame } = require("../../src/sprites/render.js");
const { PRESETS } = require("../../src/sprites/presets.js");

const CASES = [
  ...[0, 1, 2, 3, 4, 5].map(f => ["walk", f, {}]),
  ["sit", 0, {}], ["sit", 1, {}], ["sit", 1, { happy: true }], ["sit", 0, { blink: true }], ["sit", 0, { yawn: true }],
  ["sleep", 0, {}], ["sleep", 1, {}]
];
const PROTO_IDS = ["shiba", "maltese", "blacktan", "cheese", "tuxedo", "russian"];

test("the six prototype breeds render pixel-identical to the prototype", () => {
  for (const id of PROTO_IDS) {
    const preset = PRESETS.find(p => p.id === id);
    assert.ok(preset, `preset ${id} exists`);
    for (const [pose, f, flags] of CASES) {
      const proto = globalThis.PixelPet.render(id, pose, f, flags);
      const want = proto.px.map(k => (k ? proto.pal[k] : null));
      const got = renderFrame(preset.spec, pose, f, flags);
      assert.strictEqual(got.w, 48);
      assert.strictEqual(got.h, 40);
      assert.deepStrictEqual(got.px, want, `${id} ${pose} ${f} ${JSON.stringify(flags)}`);
    }
  }
});

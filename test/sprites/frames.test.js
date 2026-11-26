const test = require("node:test");
const assert = require("node:assert");
const { FRAME_LIST, POSES, renderAllFrames, frameKey } = require("../../src/sprites/frames.js");
const { renderKeys } = require("../../src/sprites/render.js");
const { PRESETS } = require("../../src/sprites/presets.js");

const NEW_POSES = ["crouch", "air", "land", "fall", "held", "lookdown", "stretch", "roll", "chase"];

test("frame list covers every pose with its frame count and uses pose:frame:flags keys", () => {
  for (const pose of NEW_POSES) assert.ok(POSES[pose] >= 1, pose);
  assert.deepStrictEqual(
    { walk: POSES.walk, sit: POSES.sit, sleep: POSES.sleep, air: POSES.air, held: POSES.held, stretch: POSES.stretch, roll: POSES.roll, chase: POSES.chase },
    { walk: 6, sit: 2, sleep: 2, air: 2, held: 2, stretch: 2, roll: 2, chase: 4 });
  assert.strictEqual(frameKey("sit", 1, { happy: true }), "sit:1:happy");
  assert.strictEqual(frameKey("walk", 3, {}), "walk:3:");
  const keys = FRAME_LIST.map(f => f.key);
  for (const k of ["sit:0:sad", "sit:1:sad", "sit:0:yawn", "air:1:", "chase:3:"]) assert.ok(keys.includes(k), k);
  assert.strictEqual(new Set(keys).size, keys.length);
});

test("every preset draws every frame with a real body inside the grid", () => {
  for (const p of PRESETS) {
    const all = renderAllFrames(p.spec);
    assert.strictEqual(all.size, FRAME_LIST.length);
    for (const [key, fr] of all) {
      assert.strictEqual(fr.px.length, 1920, key);
      const painted = fr.px.filter(Boolean).length;
      assert.ok(painted >= 300, `${p.id} ${key}: ${painted} painted`);
    }
  }
});

test("multi-frame poses actually move between frames", () => {
  for (const p of PRESETS) {
    const all = renderAllFrames(p.spec);
    for (const pose of Object.keys(POSES).filter(k => POSES[k] > 1)) {
      const frames = FRAME_LIST.filter(f => f.pose === pose && Object.keys(f.flags).length === 0).map(f => all.get(f.key).px.join());
      assert.strictEqual(new Set(frames).size, frames.length, `${p.id} ${pose}`);
    }
  }
});

test("falling and landing never show a tongue or an open mouth", () => {
  for (const p of PRESETS) for (const [pose, f] of [["fall", 0], ["land", 0]]) {
    const { px } = renderKeys(p.spec, pose, f, {});
    assert.ok(!px.includes("P") && !px.includes("PD"), `${p.id} ${pose}`);
  }
});

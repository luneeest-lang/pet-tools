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

test("rolling over shows the whole pet upside down with paws up", () => {
  for (const id of ["shiba", "cheese"]) {
    const spec = PRESETS.find(p => p.id === id).spec;
    const { px } = renderKeys(spec, "roll", 0, {});
    const rowOf = key => { const ys = []; px.forEach((k, i) => { if (k === key) ys.push(Math.floor(i / 48)); }); return ys; };
    const nose = rowOf(id === "shiba" ? "N" : "Q"), eyes = rowOf("K").filter(y => y > 15);
    // 거꾸로 된 얼굴: 코가 눈보다 위에 있다
    assert.ok(Math.max(...nose) < Math.min(...eyes), `${id}: nose rows ${nose} eyes rows ${eyes}`);
    // 발(양말 칸이 있는 아래쪽 다리)이 몸보다 위쪽 절반에 있다
    const painted = px.map((k, i) => (k ? Math.floor(i / 48) : 99)).filter(y => y < 99);
    assert.ok(Math.min(...painted) < 22, `${id}: top painted row ${Math.min(...painted)}`);
  }
});

test("a held pet hangs with its legs stretched down below its body", () => {
  for (const id of ["shiba", "cheese"]) {
    const { px } = renderKeys(PRESETS.find(p => p.id === id).spec, "held", 0, {});
    const rows = px.map((k, i) => (k ? Math.floor(i / 48) : -1)).filter(y => y >= 0);
    const top = Math.min(...rows), bottom = Math.max(...rows);
    assert.ok(bottom - top >= 36, `${id}: hanging height ${bottom - top}`);
    // 몸 아래로 다리만 보이는 줄(따로 떨어진 다리가 2개 이상)이 7줄 이상 이어진다
    let legRows = 0;
    for (let y = bottom; y > top; y--) {
      const row = px.slice(y * 48, y * 48 + 48).map(Boolean);
      const runs = row.reduce((n, on, i) => n + (on && !row[i - 1] ? 1 : 0), 0);
      if (runs >= 2) legRows++; else break;
    }
    assert.ok(legRows >= 7, `${id}: rows of dangling legs ${legRows}`);
  }
});

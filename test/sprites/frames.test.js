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

test("a held pet faces front, hooks its front paws up and dangles its hind paws with pads showing", () => {
  for (const id of ["shiba", "maltese", "cheese", "black"]) {
    const spec = PRESETS.find(p => p.id === id).spec;
    const { px } = renderKeys(spec, "held", 0, {});
    const cols = key => px.map((k, i) => (k === key ? i % 48 : -1)).filter(x => x >= 0);
    const rows = key => px.map((k, i) => (k === key ? Math.floor(i / 48) : -1)).filter(y => y >= 0);
    // 정면 얼굴: 코가 두 눈 가운데에 있다
    const noseKey = spec.species === "dog" ? "N" : "Q";
    const noseX = (Math.min(...cols(noseKey)) + Math.max(...cols(noseKey))) / 2;
    const eyeX = cols("H");
    const mid = (Math.min(...eyeX) + Math.max(...eyeX) + 1) / 2;
    assert.ok(Math.abs(noseX - mid) <= 1.5, `${id}: nose x ${noseX}, eyes mid ${mid}`);
    // 뒷발 두 개가 맨 아래에 따로 늘어져 있고 발바닥 젤리가 보인다
    const painted = px.map((k, i) => (k ? Math.floor(i / 48) : -1)).filter(y => y >= 0);
    const bottom = Math.max(...painted);
    const row = px.slice((bottom - 1) * 48, bottom * 48).map(Boolean);
    const runs = row.reduce((n, on, i) => n + (on && !row[i - 1] ? 1 : 0), 0);
    assert.ok(runs >= 2, `${id}: two hind paws at the bottom (${runs})`);
    assert.ok(rows("PAD").filter(y => y >= bottom - 7).length >= 6, `${id}: paw pads`);
    // 앞발이 턱 양옆에 걸쳐 있다: 눈보다 아래, 몸 위쪽 절반에서 머리 양옆으로 나온 칸
    const eyeRows = rows("H");
    const pawRow = Math.max(...eyeRows) + 6;
    const line = px.slice(pawRow * 48, pawRow * 48 + 48).map(Boolean);
    const left = line.indexOf(true), right = line.lastIndexOf(true);
    assert.ok(right - left >= 26, `${id}: paws spread wide at row ${pawRow} (${right - left})`);
  }
});

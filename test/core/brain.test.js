const test = require("node:test");
const assert = require("node:assert");
const { createBrain } = require("../../src/core/brain.js");

function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

function sample(ctx, n = 10000, seed = 7) {
  const brain = createBrain(lcg(seed));
  const counts = {}, picks = [];
  for (let i = 0; i < n; i++) { const p = brain.next(ctx); counts[p.state] = (counts[p.state] || 0) + 1; picks.push(p); }
  for (const k of Object.keys(counts)) counts[k] /= n;
  return { counts, picks };
}
const DAY = { sad: false, hour: 14, unlocked: ["stretch"], onWindow: false };
const near = (a, b) => Math.abs((a || 0) - b) <= 0.02;

test("daytime choices follow the starting odds", () => {
  const { counts } = sample(DAY);
  assert.ok(near(counts.walk, 0.5), `walk ${counts.walk}`);
  assert.ok(near(counts.sit, 0.25), `sit ${counts.sit}`);
  assert.ok(near(counts.yawn, 0.08), `yawn ${counts.yawn}`);
  assert.ok(near(counts.sleep, 0.10), `sleep ${counts.sleep}`);
  assert.ok(near(counts.trick, 0.07), `trick ${counts.trick}`);
});

test("without unlocked moves there are no tricks and sitting takes their share", () => {
  const { counts } = sample({ ...DAY, unlocked: [] });
  assert.strictEqual(counts.trick, undefined);
  assert.ok(near(counts.sit, 0.32), `sit ${counts.sit}`);
});

test("tricks name an unlocked move", () => {
  const { picks } = sample({ ...DAY, unlocked: ["stretch", "roll"] });
  for (const p of picks.filter(p => p.state === "trick")) assert.ok(["stretch", "roll"].includes(p.variant));
});

test("at night the pet sleeps at least twice as often", () => {
  const day = sample(DAY).counts.sleep, night = sample({ ...DAY, hour: 23 }).counts.sleep;
  assert.ok(night >= day * 2, `day ${day} night ${night}`);
  assert.ok(sample({ ...DAY, hour: 3 }).counts.sleep >= day * 2);
});

test("a sad pet walks less than a quarter of the time", () => {
  assert.ok(sample({ ...DAY, sad: true }).counts.walk < 0.25);
});

test("durations stay in their ranges", () => {
  const ranges = { walk: [3, 7], sit: [2.5, 5.5], yawn: [1.8, 1.8], sleep: [6, 12], trick: [2, 2] };
  for (const p of sample(DAY).picks) {
    const [lo, hi] = ranges[p.state];
    assert.ok(p.duration >= lo && p.duration <= hi, `${p.state} ${p.duration}`);
  }
  for (const p of sample({ ...DAY, hour: 1 }).picks.filter(p => p.state === "sleep")) assert.ok(p.duration >= 20 && p.duration <= 40);
});

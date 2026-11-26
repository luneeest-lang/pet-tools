const test = require("node:test");
const assert = require("node:assert");
const { decay, feed, pat, isSad } = require("../../src/core/stats.js");

const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const at = (full, mood, updatedAt = 0) => ({ full, mood, updatedAt });

test("while running, fullness drops 4 and mood 3 every 10 minutes", () => {
  const s = decay(at(70, 70), 10 * MIN, { running: true, sleeping: false });
  assert.strictEqual(s.full, 66);
  assert.strictEqual(s.mood, 67);
  assert.strictEqual(s.updatedAt, 10 * MIN);
});

test("mood does not drop while sleeping", () => {
  const s = decay(at(70, 70), 10 * MIN, { running: true, sleeping: true });
  assert.strictEqual(s.mood, 70);
  assert.strictEqual(s.full, 66);
});

test("time spent closed never pulls stats below 40", () => {
  assert.strictEqual(decay(at(50, 90), 1000 * HOUR, { running: false }).full, 40);
  assert.strictEqual(decay(at(50, 90), 1000 * HOUR, { running: false }).mood, 40);
  const low = decay(at(35, 20), 5 * HOUR, { running: false });
  assert.strictEqual(low.full, 35);
  assert.strictEqual(low.mood, 20);
});

test("months away still lands exactly on 40 with finite numbers", () => {
  const s = decay(at(100, 100), 180 * DAY, { running: false });
  assert.strictEqual(s.full, 40);
  assert.strictEqual(s.mood, 40);
  assert.ok(Number.isFinite(s.full) && Number.isFinite(s.mood));
});

test("a clock that went backwards changes nothing but the timestamp", () => {
  const s = decay(at(70, 60, 10 * HOUR), 2 * HOUR, { running: true });
  assert.deepStrictEqual(s, { full: 70, mood: 60, updatedAt: 2 * HOUR });
});

test("running decay stops at zero", () => {
  const s = decay(at(3, 2), 10 * HOUR, { running: true });
  assert.strictEqual(s.full, 0);
  assert.strictEqual(s.mood, 0);
});

test("feeding adds 35 fullness capped at 100 and 5 mood", () => {
  const s = feed(at(80, 50), 1000);
  assert.strictEqual(s.full, 100);
  assert.strictEqual(s.mood, 55);
});

test("patting adds 12 mood, but not again within 3 seconds", () => {
  const first = pat(at(50, 50), 10000, null);
  assert.strictEqual(first.counted, true);
  assert.strictEqual(first.stats.mood, 62);
  const again = pat(first.stats, 12000, 10000);
  assert.strictEqual(again.counted, false);
  assert.strictEqual(again.stats.mood, 62);
  assert.strictEqual(pat(first.stats, 13000, 10000).counted, true);
});

test("sad below 30 fullness or mood", () => {
  assert.strictEqual(isSad(at(29, 80)), true);
  assert.strictEqual(isSad(at(80, 29.5)), true);
  assert.strictEqual(isSad(at(30, 30)), false);
});

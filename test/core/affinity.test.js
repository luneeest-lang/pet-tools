const test = require("node:test");
const assert = require("node:assert");
const { addCare, newAffinity, UNLOCKS } = require("../../src/core/affinity.js");

const MIN = 60 * 1000;

test("unlock table", () => {
  assert.deepStrictEqual(UNLOCKS, [{ at: 30, id: "stretch" }, { at: 80, id: "roll" }, { at: 150, id: "chase" }]);
});

test("first feed of the day earns 3 plus a 5 daily bonus, the second only 3", () => {
  let { aff } = addCare(newAffinity(), "feed", 0, "2026-11-26");
  assert.strictEqual(aff.points, 8);
  ({ aff } = addCare(aff, "feed", 10 * MIN, "2026-11-26"));
  assert.strictEqual(aff.points, 11);
  ({ aff } = addCare(aff, "feed", 20 * MIN, "2026-11-27"));
  assert.strictEqual(aff.points, 19);
});

test("patting earns at most 6 points per minute", () => {
  let aff = { ...newAffinity(), lastCareDay: "2026-11-26" };
  for (let i = 0; i < 4; i++) ({ aff } = addCare(aff, "pat", i * 1000, "2026-11-26"));
  assert.strictEqual(aff.points, 6);
  ({ aff } = addCare(aff, "pat", 61 * 1000, "2026-11-26"));
  assert.strictEqual(aff.points, 8);
});

test("crossing a threshold unlocks the move once", () => {
  const start = { ...newAffinity(), points: 29, lastCareDay: "2026-11-26" };
  const r = addCare(start, "feed", 0, "2026-11-26");
  assert.strictEqual(r.aff.points, 32);
  assert.deepStrictEqual(r.newlyUnlocked, ["stretch"]);
  assert.deepStrictEqual(r.aff.unlocked, ["stretch"]);
  assert.deepStrictEqual(addCare(r.aff, "feed", 1000, "2026-11-26").newlyUnlocked, []);
});

test("crossing two thresholds at once unlocks both", () => {
  const start = { ...newAffinity(), points: 77, unlocked: [], lastCareDay: "2026-11-25" };
  const r = addCare(start, "feed", 0, "2026-11-26");
  assert.strictEqual(r.aff.points, 85);
  assert.deepStrictEqual(r.newlyUnlocked, ["stretch", "roll"]);
});

test("no daily bonus when the date goes backwards", () => {
  const start = { ...newAffinity(), points: 10, lastCareDay: "2026-11-26" };
  const r = addCare(start, "feed", 0, "2026-11-25");
  assert.strictEqual(r.aff.points, 13);
  assert.strictEqual(r.aff.lastCareDay, "2026-11-26");
});

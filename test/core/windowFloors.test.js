const test = require("node:test");
const assert = require("node:assert");
const { windowFloors } = require("../../src/core/windowFloors.js");

const D = [{ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }];
const win = (id, x, y, width, height) => ({ id, x, y, width, height });
const spans = fs => fs.map(f => [f.x1, f.x2, f.y]);

test("one window gives one floor along its top edge", () => {
  const fs = windowFloors([win("A", 100, 300, 800, 500)], D);
  assert.deepStrictEqual(spans(fs), [[100, 900, 300]]);
  assert.deepStrictEqual([fs[0].id, fs[0].kind, fs[0].windowId, fs[0].displayId], ["win:A:0", "window", "A", 1]);
});

test("a window in front cuts the covered part out", () => {
  const fs = windowFloors([win("F", 400, 200, 200, 500), win("A", 100, 300, 800, 500)], D);
  assert.deepStrictEqual(spans(fs.filter(f => f.windowId === "A")), [[100, 400, 300], [600, 900, 300]]);
  assert.deepStrictEqual(fs.filter(f => f.windowId === "A").map(f => f.id), ["win:A:0", "win:A:1"]);
});

test("a window behind does not cut the front window", () => {
  const fs = windowFloors([win("A", 100, 300, 800, 500), win("B", 400, 200, 200, 500)], D);
  assert.deepStrictEqual(spans(fs.filter(f => f.windowId === "A")), [[100, 900, 300]]);
});

test("maximized, top-pinned and narrow windows give no floor", () => {
  assert.deepStrictEqual(windowFloors([win("M", 0, 0, 1920, 1040)], D), []);
  assert.deepStrictEqual(windowFloors([win("T", 300, 1, 800, 500)], D), []);
  assert.deepStrictEqual(windowFloors([win("N", 300, 300, 150, 500)], D), []);
});

test("a window half off the right edge is cut at the screen edge", () => {
  assert.deepStrictEqual(spans(windowFloors([win("R", 1700, 300, 600, 500)], D)), [[1700, 1920, 300]]);
});

test("a window whose top edge is off screen gives no floor", () => {
  assert.deepStrictEqual(windowFloors([win("U", 300, -50, 800, 500)], D), []);
});

test("tiny leftover pieces are dropped", () => {
  const fs = windowFloors([win("F", 130, 200, 760, 500), win("A", 100, 300, 800, 500)], D);
  assert.deepStrictEqual(fs.filter(f => f.windowId === "A"), []);
});

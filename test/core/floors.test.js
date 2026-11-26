const test = require("node:test");
const assert = require("node:assert");
const { groundFloors, floorBelow, clampToDisplays } = require("../../src/core/floors.js");

const display = (id, x, y, w, h, wa) => ({ id, bounds: { x, y, width: w, height: h }, workArea: wa || { x, y, width: w, height: h - 40 } });

test("taskbar at the bottom: the ground sits on top of it", () => {
  const [f] = groundFloors([display(1, 0, 0, 1920, 1080)]);
  assert.deepStrictEqual({ y: f.y, x1: f.x1, x2: f.x2, kind: f.kind, displayId: f.displayId }, { y: 1040, x1: 0, x2: 1920, kind: "ground", displayId: 1 });
});

test("taskbar on the left or top: the ground is the bottom of the work area", () => {
  const left = groundFloors([display(1, 0, 0, 1920, 1080, { x: 60, y: 0, width: 1860, height: 1080 })])[0];
  assert.deepStrictEqual([left.y, left.x1, left.x2], [1080, 60, 1920]);
  const top = groundFloors([display(1, 0, 0, 1920, 1080, { x: 0, y: 40, width: 1920, height: 1040 })])[0];
  assert.strictEqual(top.y, 1080);
});

test("two displays side by side give one ground each", () => {
  const floors = groundFloors([display(1, 0, 0, 1920, 1080), display(2, 1920, 0, 2560, 1440)]);
  assert.strictEqual(floors.length, 2);
  assert.deepStrictEqual(floors.map(f => [f.x1, f.x2, f.y]), [[0, 1920, 1040], [1920, 4480, 1400]]);
});

test("floorBelow picks the nearest floor at or under the point", () => {
  const floors = [{ id: "a", kind: "ground", y: 1040, x1: 0, x2: 1920 }, { id: "w", kind: "window", y: 400, x1: 100, x2: 700 }];
  assert.strictEqual(floorBelow(300, 200, floors).id, "w");
  assert.strictEqual(floorBelow(900, 200, floors).id, "a");
  assert.strictEqual(floorBelow(300, 500, floors).id, "a");
  assert.strictEqual(floorBelow(5000, 200, floors), null);
});

test("points off every display are pulled into the nearest work area", () => {
  const ds = [display(1, 0, 0, 1920, 1080), display(2, 1920, 0, 2560, 1440)];
  const p = clampToDisplays({ x: -500, y: -300 }, ds);
  assert.deepStrictEqual(p, { x: 0, y: 0, displayId: 1 });
  const q = clampToDisplays({ x: 9000, y: 500 }, ds);
  assert.strictEqual(q.displayId, 2);
  assert.strictEqual(q.x, 4480);
  const inside = clampToDisplays({ x: 2000, y: 700 }, ds);
  assert.deepStrictEqual(inside, { x: 2000, y: 700, displayId: 2 });
});

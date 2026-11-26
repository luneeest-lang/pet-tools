const test = require("node:test");
const assert = require("node:assert");
const { jumpVelocity } = require("../../src/core/jump.js");
const { stepBody } = require("../../src/core/physics.js");

function fly(from, v, floors, seconds = 1.5) {
  let body = { x: from.x, y: from.y, vx: v.vx, vy: v.vy, state: "air", floorId: null };
  for (let t = 0; t < seconds && body.state === "air"; t += 1 / 60) body = stepBody(body, 1 / 60, floors).body;
  return body;
}

test("jumping up onto a window lands on its top near the target", () => {
  const from = { x: 500, y: 1040 }, to = { x: 700, y: 600 };
  const v = jumpVelocity(from, to, 40);
  assert.ok(v.vy < 0 && v.time > 0);
  const b = fly(from, v, [{ id: "w", y: 600, x1: 650, x2: 900 }]);
  assert.strictEqual(b.state, "ground");
  assert.strictEqual(b.y, 600);
  assert.ok(Math.abs(b.x - 700) <= 8, `x ${b.x}`);
});

test("hopping down lands on the ground near the target", () => {
  const from = { x: 800, y: 600 }, to = { x: 950, y: 1040 };
  const v = jumpVelocity(from, to, 24);
  assert.ok(v.vy < 0);
  const b = fly(from, v, [{ id: "g", y: 1040, x1: 0, x2: 1920 }]);
  assert.strictEqual(b.y, 1040);
  assert.ok(Math.abs(b.x - 950) <= 8, `x ${b.x}`);
});

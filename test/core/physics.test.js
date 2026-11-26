const test = require("node:test");
const assert = require("node:assert");
const { stepBody, relocate, GRAVITY, MAX_FALL } = require("../../src/core/physics.js");
const { groundFloors } = require("../../src/core/floors.js");

const display = (id, x, y, w, h) => ({ id, bounds: { x, y, width: w, height: h }, workArea: { x, y, width: w, height: h - 40 } });
const ONE = [display(1, 0, 0, 1920, 1080)];

test("constants", () => { assert.strictEqual(GRAVITY, 2400); assert.strictEqual(MAX_FALL, 1400); });

test("a body dropped at y=200 lands on the ground once, never exceeding max fall speed", () => {
  const floors = groundFloors(ONE);
  let body = { x: 500, y: 200, vx: 0, vy: 0, state: "air", floorId: null }, landings = 0;
  for (let i = 0; i < 200 && body.state === "air"; i++) {
    const r = stepBody(body, 1 / 30, floors);
    body = r.body;
    if (r.landed) landings++;
    assert.ok(body.vy <= MAX_FALL);
  }
  assert.strictEqual(body.state, "ground");
  assert.strictEqual(body.y, 1040);
  assert.strictEqual(body.vy, 0);
  assert.strictEqual(landings, 1);
  assert.strictEqual(body.floorId, floors[0].id);
});

test("a huge time step still does not tunnel through the floor", () => {
  const floors = groundFloors(ONE);
  const r = stepBody({ x: 500, y: 1000, vx: 0, vy: 1400, state: "air", floorId: null }, 0.5, floors);
  assert.strictEqual(r.landed, true);
  assert.strictEqual(r.body.y, 1040);
});

test("a pet whose display was unplugged falls onto a remaining display", () => {
  const two = [display(1, 0, 0, 1920, 1080), display(2, 1920, 0, 1920, 1080)];
  const floors2 = groundFloors(two);
  const body = { x: 2500, y: 1040, vx: 0, vy: 0, state: "ground", floorId: floors2[1].id };
  const moved = relocate(body, groundFloors(two.slice(0, 1)), two.slice(0, 1));
  assert.ok(moved.x >= 0 && moved.x <= 1920);
  assert.strictEqual(moved.state, "air");
});

test("dropping a pet above and left of every screen brings it back and it lands", () => {
  const floors = groundFloors(ONE);
  let body = relocate({ x: -500, y: -300, vx: 0, vy: 0, state: "air", floorId: null }, floors, ONE);
  assert.ok(body.x >= 0 && body.y >= 0);
  for (let i = 0; i < 300 && body.state === "air"; i++) body = stepBody(body, 1 / 30, floors).body;
  assert.strictEqual(body.y, 1040);
});

test("a body standing on a floor that still exists stays put", () => {
  const floors = groundFloors(ONE);
  const body = { x: 500, y: 1040, vx: 0, vy: 0, state: "ground", floorId: floors[0].id };
  assert.deepStrictEqual(relocate(body, floors, ONE), body);
});

test("when the work area grows on the same display, a grounded pet falls to the new floor", () => {
  const small = [display(1, 0, 0, 1920, 1080)];
  const big = [{ id: 1, bounds: { x: 0, y: 0, width: 2560, height: 1440 }, workArea: { x: 0, y: 0, width: 2560, height: 1400 } }];
  const body = { x: 500, y: 1040, vx: 0, vy: 0, state: "ground", floorId: groundFloors(small)[0].id };
  const floors = groundFloors(big);
  let b = relocate(body, floors, big);
  assert.strictEqual(b.state, "air");
  for (let i = 0; i < 300 && b.state === "air"; i++) b = stepBody(b, 1 / 30, floors).body;
  assert.strictEqual(b.y, 1400);
});

test("when the floor moves up on the same display, the pet snaps onto it", () => {
  const body = { x: 500, y: 1080, vx: 0, vy: 0, state: "ground", floorId: "ground:1" };
  const b = relocate(body, groundFloors(ONE), ONE);
  assert.strictEqual(b.state, "ground");
  assert.strictEqual(b.y, 1040);
});

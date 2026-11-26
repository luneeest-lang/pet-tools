const test = require("node:test");
const assert = require("node:assert");
const { createPetController } = require("../../src/main/petController.js");
const { defaultSave } = require("../../src/core/save.js");
const { FRAME_LIST } = require("../../src/sprites/frames.js");

const KEYS = new Set(FRAME_LIST.map(f => f.key));
const NOW = new Date(2026, 10, 26, 12).getTime(); // PC 시각 기준 낮 12시
const display = (id, x, w, h) => ({ id, bounds: { x, y: 0, width: w, height: h }, workArea: { x, y: 0, width: w, height: h - 40 } });
const ONE = [display(1, 0, 1920, 1080)];

function setup({ rng = () => 0.7, displays = ONE, position = null } = {}) {
  const save = defaultSave(NOW, "ko");
  if (position) save.pets[0].position = position;
  const log = { frames: [], moves: [], bubbles: [] };
  const c = createPetController({
    save, displays, now: NOW, rng,
    onFrame: f => log.frames.push(f), onMoveWindow: p => log.moves.push(p), onBubble: b => log.bubbles.push(b)
  });
  let now = NOW;
  const run = (seconds, dt = 1 / 30) => { for (let t = 0; t < seconds; t += dt) { now += dt * 1000; c.tick(dt, now); } };
  return { c, log, run, at: () => now };
}

test("the pet starts standing on the ground and draws known frames", () => {
  const { c, log, run } = setup();
  run(0.5);
  assert.ok(log.frames.length > 0);
  for (const f of log.frames) assert.ok(KEYS.has(f.key), f.key);
  assert.strictEqual(c.getBody().y, 1040);
  assert.strictEqual(c.getBody().state, "ground");
});

test("grab, drag up, release: it dangles, falls and lands back on the ground", () => {
  const { c, log, run, at } = setup();
  run(0.5);
  const b = c.getBody();
  c.grab(b.x, b.y - 30, at());
  c.drag(b.x + 40, 100, at());
  run(0.3);
  c.release(b.x + 40, 100, at());
  run(2);
  const keys = log.frames.map(f => f.key);
  const iHeld = keys.findIndex(k => k.startsWith("held:")), iFall = keys.indexOf("fall:0:"), iLand = keys.indexOf("land:0:");
  assert.ok(iHeld >= 0 && iFall > iHeld && iLand > iFall, keys.join(" "));
  assert.strictEqual(c.getBody().y, 1040);
});

test("a short click is a pat: +12 mood and hearts", () => {
  const { c, log, run, at } = setup();
  run(0.2);
  const before = c.getSave().pets[0].stats.mood;
  const b = c.getBody();
  c.grab(b.x, b.y - 20, at());
  c.drag(b.x + 2, b.y - 20, at() + 50);
  c.release(b.x + 2, b.y - 20, at() + 100);
  assert.ok(Math.abs(c.getSave().pets[0].stats.mood - (before + 12)) < 0.01);
  assert.ok(log.bubbles.some(x => x.kind === "pat" && x.hearts === 3));
});

test("feeding a sleeping pet changes nothing and says it is asleep", () => {
  const { c, log, run } = setup();
  run(0.2);
  c.sleepToggle();
  run(0.2);
  const before = c.getSave().pets[0].stats.full;
  c.feed();
  assert.ok(Math.abs(c.getSave().pets[0].stats.full - before) < 0.01);
  assert.ok(log.bubbles.some(x => x.kind === "sleeping"));
});

test("feeding fills up, shows the bowl and earns affinity", () => {
  const { c, log, run } = setup();
  run(0.2);
  c.feed();
  assert.ok(c.getSave().pets[0].stats.full > 100 - 0.01);
  assert.ok(log.bubbles.some(x => x.kind === "feed" && x.bowl === true));
  assert.strictEqual(c.getSave().pets[0].affinity.points, 8);
});

test("while sitting for five seconds the window never moves", () => {
  const { log, run } = setup({ rng: () => 0.7 });
  run(0.2);
  const moves = log.moves.length;
  run(5);
  assert.strictEqual(log.moves.length, moves);
});

test("an unplugged display drops the pet onto the remaining one", () => {
  const two = [display(1, 0, 1920, 1080), display(2, 1920, 1920, 1080)];
  const { c, run } = setup({ displays: two, position: { displayId: 2, x: 2500, floor: "ground" } });
  run(0.2);
  assert.ok(c.getBody().x > 1920);
  c.setDisplays(two.slice(0, 1));
  run(1.5);
  assert.ok(c.getBody().x <= 1920);
  assert.strictEqual(c.getBody().y, 1040);
});

test("walking across a screen edge works only when the floors line up", () => {
  const same = [display(1, 0, 1920, 1080), display(2, 1920, 1920, 1080)];
  const a = setup({ rng: () => 0.45, displays: same, position: { displayId: 1, x: 1890, floor: "ground" } });
  a.run(2);
  assert.ok(a.c.getBody().x > 1920, `crossed: ${a.c.getBody().x}`);
  const diff = [display(1, 0, 1920, 1080), display(2, 1920, 2560, 1440)];
  const b = setup({ rng: () => 0.45, displays: diff, position: { displayId: 1, x: 1890, floor: "ground" } });
  b.run(2);
  assert.ok(b.c.getBody().x <= 1920, `turned: ${b.c.getBody().x}`);
});

test("a clock that jumps backwards never freezes the pet or asks for frames that do not exist", () => {
  const { c, log, run, at } = setup({ rng: () => 0.45 });
  run(1);
  c.tick(-3600, at() - 3600 * 1000);
  run(8);
  for (const f of log.frames) assert.ok(KEYS.has(f.key), f.key);
  assert.ok(c.getBody().x > 0 && c.getBody().x < 1920);
});

test("time the computer spent asleep counts like time the app was closed", () => {
  const { c, run, at } = setup();
  run(0.5);
  c.tick(1 / 30, at() + 10 * 3600 * 1000);
  const s = c.getSave().pets[0].stats;
  assert.strictEqual(s.full, 40);
  assert.strictEqual(s.mood, 40);
});

test("releasing the pet over the taskbar lands it on the taskbar, not off screen", () => {
  const { c, run, at } = setup();
  run(0.3);
  const b = c.getBody();
  c.grab(b.x, b.y - 20, at());
  c.drag(b.x + 30, 1070, at());
  c.release(b.x + 30, 1070, at());
  run(2);
  assert.strictEqual(c.getBody().state, "ground");
  assert.strictEqual(c.getBody().y, 1040);
});

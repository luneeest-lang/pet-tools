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

/* ---------- 2단계: 창 위 ---------- */
const WIN = (x = 300, y = 400, width = 900, height = 500, id = "N") => ({ id, x, y, width, height });

function dropOn(c, at, x, y) {
  const b = c.getBody();
  c.grab(b.x, b.y - 20, at());
  c.drag(x, y - 20, at());
  c.release(x, y - 20, at());
}

test("a pet dropped above an open window lands on its top", () => {
  const { c, run, at } = setup();
  c.setWindows([WIN()]);
  run(0.3);
  dropOn(c, at, 700, 300);
  run(1.5);
  assert.ok(c.getBody().floorId.startsWith("win:N:"), c.getBody().floorId);
  assert.strictEqual(c.getBody().y, 400);
});

test("moving the window carries the pet along", () => {
  const { c, run, at } = setup({ rng: () => 0.7 });
  c.setWindows([WIN()]);
  run(0.3);
  dropOn(c, at, 700, 300);
  run(1.5);
  const before = c.getBody();
  c.setWindows([WIN(500, 350)]);
  const after = c.getBody();
  assert.ok(Math.abs(after.x - (before.x + 200)) < 0.01);
  assert.strictEqual(after.y, 350);
  assert.strictEqual(after.state, "ground");
});

test("pushing the window off screen so the pet's spot is gone drops it to the taskbar", () => {
  const { c, run, at } = setup({ rng: () => 0.7 });
  c.setWindows([WIN()]);
  run(0.3);
  dropOn(c, at, 1100, 300);
  run(1.5);
  c.setWindows([WIN(1100 + 900, 400)]); // 창이 화면 오른쪽 밖으로
  run(2);
  assert.strictEqual(c.getBody().y, 1040);
  assert.strictEqual(c.getBody().state, "ground");
});

test("another window covering the pet's spot makes it fall", () => {
  const { c, run, at } = setup({ rng: () => 0.7 });
  c.setWindows([WIN()]);
  run(0.3);
  dropOn(c, at, 700, 300);
  run(1.5);
  const x = c.getBody().x;
  c.setWindows([WIN(x - 150, 200, 300, 400, "F"), WIN()]);
  run(2);
  assert.strictEqual(c.getBody().y, 1040);
});

test("closing the window under the pet shows a surprised fall and a landing with finite coordinates", () => {
  const { c, log, run, at } = setup({ rng: () => 0.7 });
  c.setWindows([WIN()]);
  run(0.3);
  dropOn(c, at, 700, 300);
  run(1.5);
  const from = log.frames.length;
  c.setWindows([]);
  run(2);
  const keys = log.frames.slice(from).map(f => f.key);
  assert.ok(keys.indexOf("fall:0:") >= 0 && keys.indexOf("land:0:") > keys.indexOf("fall:0:"), keys.join(" "));
  const b = c.getBody();
  assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y));
  assert.strictEqual(b.y, 1040);
});

test("with perching turned off, a pet dropped over a window falls to the taskbar", () => {
  const { c, run, at } = setup();
  c.setPerch(false);
  c.setWindows([WIN()]);
  run(0.3);
  dropOn(c, at, 700, 300);
  run(2);
  assert.strictEqual(c.getBody().y, 1040);
});

const keysAfter = (log, from) => log.frames.slice(from).map(f => f.key);
const inOrder = (keys, seq) => { let i = -1; for (const k of seq) { i = keys.findIndex((x, j) => j > i && (k instanceof RegExp ? k.test(x) : x === k)); if (i < 0) return false; } return true; };

test("on the ground the pet eventually jumps up onto a nearby window", () => {
  const { c, log, run } = setup({ rng: () => 0.45 });
  c.setWindows([WIN(300, 600, 900, 400)]);
  run(240, 1 / 15);
  const keys = keysAfter(log, 0);
  assert.ok(inOrder(keys, ["crouch:0:", "air:0:", "air:1:", "land:0:"]), "jump sequence");
  for (const k of keys) assert.ok(KEYS.has(k), k);
});

test("after a while on a window the pet looks down and then hops off", () => {
  const { c, log, run, at } = setup({ rng: () => 0.45 });
  c.setWindows([WIN(300, 600, 900, 400)]);
  run(0.3);
  dropOn(c, at, 700, 500);
  run(1.5);
  assert.ok(c.getBody().floorId.startsWith("win:"));
  const from = log.frames.length;
  run(200, 1 / 15);
  const keys = keysAfter(log, from);
  assert.ok(inOrder(keys, ["lookdown:0:", /^air:/, "land:0:"]), keys.slice(0, 40).join(" "));
});

test("hanging from the edge puts the front paws on the window top, then it drops", () => {
  const { c, log, run, at } = setup({ rng: () => 0.7 });
  c.setWindows([WIN(300, 600, 900, 400)]);
  run(0.3);
  dropOn(c, at, 700, 500);
  run(1.5);
  let sawHang = false;
  for (let i = 0; i < 200 * 15; i++) {
    run(1 / 15, 1 / 15);
    if (c.getMode() === "hang") { sawHang = true; assert.strictEqual(c.getBody().y, 600 + 17 * 3); }
  }
  assert.ok(sawHang, "hung from the edge");
  assert.ok(log.frames.some(f => f.key.startsWith("held:")));
  assert.strictEqual(c.getBody().y, 1040);
});

test("after hanging, the pet can climb back up onto the window", () => {
  let c;
  const s = setup({ rng: () => (c && c.getMode() === "hang" ? 0.3 : 0.7) });
  c = s.c;
  c.setWindows([WIN(300, 600, 900, 400)]);
  s.run(0.3);
  dropOn(c, s.at, 700, 500);
  s.run(1.5);
  let climbed = false, hung = false;
  for (let i = 0; i < 200 * 15 && !climbed; i++) {
    s.run(1 / 15, 1 / 15);
    if (c.getMode() === "hang") hung = true;
    if (hung && c.getMode() !== "hang" && c.getMode() !== "climb" && c.getBody().state === "ground") climbed = true;
  }
  assert.ok(climbed);
  assert.strictEqual(c.getBody().y, 600);
  assert.ok(c.getBody().floorId.startsWith("win:"));
});

test("with perching off the pet never jumps up or hangs", () => {
  const { c, log, run } = setup({ rng: () => 0.45 });
  c.setPerch(false);
  c.setWindows([WIN(300, 600, 900, 400)]);
  run(240, 1 / 15);
  assert.ok(!log.frames.some(f => f.key === "crouch:0:" || f.key.startsWith("held:")));
});

test("hopping off a very high window falls with the surprised pose and still lands", () => {
  const { c, log, run, at } = setup({ rng: () => 0.45 });
  c.setWindows([WIN(300, 150, 900, 400)]);
  run(0.3);
  dropOn(c, at, 700, 100);
  run(1.5);
  const from = log.frames.length;
  run(200, 1 / 15);
  const keys = keysAfter(log, from);
  assert.ok(inOrder(keys, ["lookdown:0:", "fall:0:", "land:0:"]), keys.slice(0, 40).join(" "));
  for (const k of keys) assert.ok(KEYS.has(k), k);
});

test("patting the pet while it walks to the edge still lets it leave the window later", () => {
  const { c, run, at } = setup({ rng: () => 0.45 });
  c.setWindows([WIN(300, 600, 900, 400)]);
  run(0.3);
  dropOn(c, at, 700, 500);
  run(1.5);
  let patted = false;
  for (let i = 0; i < 200 * 15 && !patted; i++) {
    run(1 / 15, 1 / 15);
    if (c.getMode() === "toEdge") { c.pat(); patted = true; }
  }
  assert.ok(patted, "reached toEdge");
  run(240, 1 / 15);
  assert.ok(!(c.getBody().floorId || "").startsWith("win:"), `still on ${c.getBody().floorId}`);
});

test("unlocking a move while hanging does not leave the pet hanging forever", () => {
  const { c, run, at } = setup({ rng: () => 0.7 });
  c.getPet().affinity.points = 29;
  c.getPet().affinity.lastCareDay = "2999-01-01";
  c.setWindows([WIN(300, 600, 900, 400)]);
  run(0.3);
  dropOn(c, at, 700, 500);
  run(1.5);
  for (let i = 0; i < 200 * 15 && c.getMode() !== "hang"; i++) run(1 / 15, 1 / 15);
  assert.strictEqual(c.getMode(), "hang");
  c.feed();
  run(30, 1 / 15);
  assert.notStrictEqual(c.getBody().state, "hang");
});

test("a window piece narrower than the pet does not make it flip back and forth", () => {
  const { c, log, run, at } = setup({ rng: () => 0.45 });
  // 앞의 F가 A의 윗변 700~880을 가려 A에는 120px(펫 132px보다 좁음) 조각만 남는다.
  c.setWindows([WIN(600, 500, 280, 400, "F"), WIN(700, 600, 300, 400, "A")]);
  run(0.3);
  const narrow = c.getFloors().find(f => f.windowId === "A");
  assert.ok(narrow && narrow.x2 - narrow.x1 < 2 * 22 * 3, JSON.stringify(c.getFloors()));
  dropOn(c, at, (narrow.x1 + narrow.x2) / 2, 500);
  run(1.5);
  const from = log.frames.length;
  run(3);
  const flips = log.frames.slice(from).reduce((n, f, i, a) => n + (i > 0 && a[i - 1].flip !== f.flip ? 1 : 0), 0);
  assert.ok(flips <= 2, `flips ${flips}`);
});

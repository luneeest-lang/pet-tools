// 펫 한 마리의 시뮬레이션: 상태 수치, 행동, 물리, 입력, 그림 키 고르기.
// Electron에 의존하지 않는다. 창 이동·그림·말풍선은 콜백으로만 내보낸다.
const { decay, feed, pat, isSad } = require("../core/stats.js");
const { addCare } = require("../core/affinity.js");
const { createBrain } = require("../core/brain.js");
const { groundFloors } = require("../core/floors.js");
const { windowFloors } = require("../core/windowFloors.js");
const { stepBody, relocate } = require("../core/physics.js");
const { jumpVelocity } = require("../core/jump.js");
const { floorBelow } = require("../core/floors.js");

const WALK_SPEED = 40;            // px/s (크기 3배 기준)
const CLICK_MOVE = 6, CLICK_MS = 400;
const LAND_SECONDS = 0.15, EAT_SECONDS = 3.2, HAPPY_SECONDS = 2.6;
const HOVER_SECONDS = 0.6;
const SUSPEND_GAP_MS = 60 * 1000;
const TRICK_FPS = { stretch: 1.5, roll: 4, chase: 6 };
const TRICK_FRAMES = { stretch: 2, roll: 2, chase: 4 };
// 창 위 시간표(설계 6.4절)
const JUMP_EVERY = [120, 240], STAY_ON_WINDOW = [30, 180], HANG_SECONDS = [3, 6];
const CROUCH_SECONDS = 0.25, LOOKDOWN_SECONDS = 0.8, CLIMB_SECONDS = 0.3;
const JUMP_UP_APEX = 40, JUMP_DOWN_APEX = 24;
const HANG_DROP = 17;   // 매달릴 때 발 선이 창 윗선보다 내려가는 칸 수(앞발이 윗선에 닿게)

function localDay(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function petWindowSize(scale) {
  return { w: 48 * scale + 80, h: 40 * scale + 110 };
}

function createPetController({ save, displays, now, rng = Math.random, onFrame, onMoveWindow, onBubble }) {
  const data = JSON.parse(JSON.stringify(save));
  const pet = data.pets.find(p => p.id === data.activePetIds[0]) || data.pets[0];
  const brain = createBrain(rng);
  let scale = data.settings.scale || 3;
  let screens = displays;
  let wins = [];
  let perch = data.settings.perchOnWindows !== false;
  let floors = [];
  const rebuildFloors = () => { floors = groundFloors(screens).concat(perch ? windowFloors(wins, screens) : []); };
  rebuildFloors();
  let clock = now, lastTickAt = now, t = 0;
  let mode = "sit", until = 0, variant = null, dir = 1;
  let happyUntil = -1, lastPatAt = null;
  let pointer = null;             // { downAt, x0, y0, dx, dy, held }
  let hoverSince = null, hoverShown = false;
  let lastKey = null, lastFlip = null, lastWin = null;
  const between = (a, b) => a + (b - a) * rng();
  let nextJumpAt = between(...JUMP_EVERY), stayUntil = Infinity;
  let pending = null, edgeX = null, bigFall = false, climbTo = null;

  pet.stats = decay(pet.stats, now, { running: false });

  function initialBody() {
    const pos = pet.position;
    const floor = (pos && floors.find(f => f.id === `ground:${pos.displayId}`)) || floors.find(f => f.kind === "ground") || floors[0];
    const x = pos && floor.id === `ground:${pos.displayId}` ? Math.min(Math.max(pos.x, floor.x1), floor.x2) : (floor.x1 + floor.x2) / 2;
    return { x, y: floor.y, vx: 0, vy: 0, state: "ground", floorId: floor.id };
  }
  let body = initialBody();

  const halfW = () => 22 * scale;
  const bubble = b => onBubble && onBubble(b);

  function setMode(m, seconds, v = null) { mode = m; until = t + seconds; variant = v; }

  function pickNext() {
    const next = brain.next({ sad: isSad(pet.stats), hour: new Date(clock).getHours(), unlocked: pet.affinity.unlocked, onWindow: !!windowIdOf(body.floorId) });
    if (next.state === "walk" && perch && t >= nextJumpAt && floorOf(body.floorId)?.kind === "ground") {
      nextJumpAt = t + between(...JUMP_EVERY);
      const target = findJumpTarget();
      if (target) return startJump(target, JUMP_UP_APEX);
    }
    setMode(next.state, next.duration, next.variant || null);
    if (next.state === "walk" && rng() < 0.35) dir = -dir;
  }

  const displayOf = floor => screens.find(d => d.id === (floor && floor.displayId)) || screens[0];

  // 가로 화면 40%, 세로 60% 안에 있는 위쪽 창 바닥 중 가장 가까운 곳
  function findJumpTarget() {
    const here = floorOf(body.floorId), d = displayOf(here);
    let best = null;
    for (const f of floors) {
      if (f.kind !== "window") continue;
      const rise = body.y - f.y;
      if (rise < 40 || rise > 0.6 * d.bounds.height) continue;
      const wide = f.x2 - f.x1 >= 2 * halfW();
      const x = wide ? Math.min(Math.max(body.x, f.x1 + halfW()), f.x2 - halfW()) : (f.x1 + f.x2) / 2;
      const dist = Math.abs(x - body.x);
      if (dist > 0.4 * d.bounds.width) continue;
      if (!best || dist < best.dist) best = { x, y: f.y, dist };
    }
    return best && { x: best.x, y: best.y };
  }

  function startJump(to, apex) {
    if (to.x !== body.x) dir = to.x > body.x ? 1 : -1;
    pending = { to, apex };
    setMode("crouch", CROUCH_SECONDS);
  }

  function launch() {
    const d = displayOf(floorOf(body.floorId));
    const v = jumpVelocity(body, pending.to, pending.apex);
    bigFall = pending.to.y - body.y > 0.5 * d.bounds.height;
    body = { ...body, state: "air", vx: v.vx, vy: v.vy, floorId: null };
    pending = null;
    setMode("jump", Infinity);
  }

  // 창 위에서 내려갈 때: 가까운 끝으로 걸어간다.
  function goEdge() {
    const f = floorOf(body.floorId);
    const left = body.x - f.x1 < f.x2 - body.x;
    dir = left ? -1 : 1;
    edgeX = left ? f.x1 + halfW() * 0.4 : f.x2 - halfW() * 0.4;
    setMode("toEdge", 20);
  }

  function jumpDown() {
    const f = floorOf(body.floorId), d = displayOf(f), wa = d.workArea;
    let tx = dir > 0 ? f.x2 + 30 * scale : f.x1 - 30 * scale;
    tx = Math.min(Math.max(tx, wa.x + halfW()), wa.x + wa.width - halfW());
    const below = floorBelow(tx, f.y + 1, floors) || floors.find(fl => fl.kind === "ground" && fl.displayId === d.id);
    startJump({ x: tx, y: below.y }, JUMP_DOWN_APEX);
  }

  function hang() {
    const f = floorOf(body.floorId);
    const x = dir > 0 ? f.x2 - 8 * scale : f.x1 + 8 * scale;
    body = { x, y: f.y + HANG_DROP * scale, vx: 0, vy: 0, state: "hang", floorId: f.id };
    setMode("hang", between(...HANG_SECONDS));
  }

  function afterHang() {
    const f = floorOf(body.floorId);
    if (f && rng() < 0.6) {
      const inward = dir > 0 ? f.x2 - halfW() : f.x1 + halfW();
      climbTo = { x: Math.min(Math.max(inward, f.x1), f.x2), y: f.y, floorId: f.id };
      setMode("climb", CLIMB_SECONDS);
      return;
    }
    const d = displayOf(f), ground = floorBelow(body.x, body.y, floors);
    bigFall = !!ground && ground.y - body.y > 0.5 * d.bounds.height;
    body = { ...body, state: "air", vx: 0, vy: 0, floorId: null };
    setMode("jump", Infinity);
  }

  // 특별한 동작이 끝났을 때 다음으로 넘어가기
  function advance() {
    if (mode === "crouch" && pending) return launch();
    if (mode === "lookdown") return rng() < 0.6 ? jumpDown() : hang();
    if (mode === "toEdge") return setMode("lookdown", LOOKDOWN_SECONDS);
    pickNext();
  }

  function care(kind) {
    const r = addCare(pet.affinity, kind, clock, localDay(clock));
    pet.affinity = r.aff;
    for (const id of r.newlyUnlocked) {
      bubble({ kind: "unlock", move: id });
      setMode("trick", 2, id);
    }
    return r.newlyUnlocked.length > 0;
  }

  function walk(dt) {
    const floor = floors.find(f => f.id === body.floorId);
    if (!floor) return;
    let x = body.x + dir * WALK_SPEED * (scale / 3) * dt;
    const lo = floor.x1 + halfW(), hi = floor.x2 - halfW();
    // 옆 화면 바닥이 같은 높이로 이어지면 경계를 넘어간다. 아니면 돌아선다.
    const next = dir > 0
      ? floors.find(f => f !== floor && Math.abs(f.y - floor.y) <= 2 && Math.abs(f.x1 - floor.x2) <= 1)
      : floors.find(f => f !== floor && Math.abs(f.y - floor.y) <= 2 && Math.abs(f.x2 - floor.x1) <= 1);
    if (next) {
      if ((dir > 0 && x > floor.x2) || (dir < 0 && x < floor.x1)) body = { ...body, floorId: next.id, y: next.y };
    } else if (x > hi || x < lo) {
      x = Math.min(Math.max(x, Math.min(lo, hi)), Math.max(lo, hi));
      dir = -dir;
    }
    body = { ...body, x };
  }

  const floorOf = id => floors.find(f => f.id === id);
  const windowIdOf = floorId => (floorId && floorId.startsWith("win:") ? floorId.split(":")[1] : null);

  function fallNow() {
    // 화면 밖이거나 아래에 바닥이 없으면 화면 안으로 끌어온 뒤 떨어진다.
    body = relocate({ ...body, state: "air", vx: 0, vy: 0, floorId: null }, floors, screens);
    setMode("fall", Infinity);
  }

  // 펫이 서 있는 창이 움직이면 같이 움직이고, 그 자리가 사라지면 떨어진다.
  function followWindow(prevWins) {
    const winId = windowIdOf(body.floorId);
    if (!winId || (body.state !== "ground" && body.state !== "hang")) return;
    const before = prevWins.find(w => w.id === winId), now = wins.find(w => w.id === winId);
    if (!before || !now || !perch) return fallNow();
    const lift = body.state === "hang" ? HANG_DROP * scale : 0;
    const x = body.x + (now.x - before.x), y = body.y + (now.y - before.y);
    const spot = floors.find(f => f.windowId === winId && Math.abs(f.y - (y - lift)) <= 1 && x >= f.x1 && x <= f.x2);
    if (!spot) { body = { ...body, x, y, state: "air" }; return fallNow(); }
    body = { ...body, x, y: spot.y + lift, floorId: spot.id };
    if (climbTo) climbTo = { ...climbTo, x: climbTo.x + (now.x - before.x), y: spot.y, floorId: spot.id };
  }

  function frameKey() {
    if (mode === "held") return `held:${Math.floor(t * 4) % 2}:`;
    if (body.state === "hang") return mode === "climb" ? "crouch:0:" : `held:${Math.floor(t * 4) % 2}:`;
    if (body.state === "air") {
      if (mode === "jump") return body.vy < 0 ? "air:0:" : bigFall ? "fall:0:" : "air:1:";
      return "fall:0:";
    }
    if (mode === "crouch") return "crouch:0:";
    if (mode === "lookdown") return "lookdown:0:";
    if (mode === "toEdge") return `walk:${Math.floor(t * 9) % 6}:`;
    if (mode === "land") return "land:0:";
    if (mode === "walk") return `walk:${Math.floor(t * 9) % 6}:`;
    if (mode === "sleep") return `sleep:${Math.floor(t * 0.9) % 2}:`;
    if (mode === "yawn") return "sit:0:yawn";
    if (mode === "eat") return Math.floor(t * 4) % 2 === 0 ? "sit:0:happy" : "sit:0:";
    if (mode === "trick" && TRICK_FRAMES[variant]) return `${variant}:${Math.floor(t * TRICK_FPS[variant]) % TRICK_FRAMES[variant]}:`;
    const f = Math.floor(t * 3) % 2;
    if (t < happyUntil) return `sit:${f}:happy`;
    if (isSad(pet.stats)) return `sit:${f}:sad`;
    if (t % 3.6 < 0.16) return "sit:0:blink";
    return `sit:${f}:`;
  }

  function emit() {
    const key = frameKey();
    const flip = dir < 0;
    if (key !== lastKey || flip !== lastFlip) {
      lastKey = key; lastFlip = flip;
      onFrame && onFrame({ key, flip });
    }
    const { w, h } = petWindowSize(scale);
    const win = { x: Math.round(body.x - w / 2), y: Math.round(body.y - h + 2 * scale) };
    if (!lastWin || win.x !== lastWin.x || win.y !== lastWin.y) {
      lastWin = win;
      onMoveWindow && onMoveWindow(win);
    }
  }

  function tick(dt, nowMs) {
    // 화면 갱신 간격은 0~0.25초로 묶는다(시계가 뒤로 가도 멈추거나 없는 그림을 찾지 않게).
    dt = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.25) : 0;
    const gap = nowMs - lastTickAt;
    clock = nowMs; lastTickAt = nowMs; t += dt;
    // 컴퓨터가 절전·최대 절전에 들어가 있던 시간(1분 넘는 공백)은 앱이 꺼져 있던 시간처럼 계산한다.
    const asleep = gap > SUSPEND_GAP_MS;
    pet.stats = decay(pet.stats, nowMs, { running: !asleep, sleeping: mode === "sleep" });
    if (mode !== "held") {
      if (body.state === "air") {
        const r = stepBody(body, dt, floors);
        body = r.body;
        if (r.landed) {
          setMode("land", LAND_SECONDS);
          bigFall = false;
          stayUntil = floorOf(body.floorId)?.kind === "window" ? t + between(...STAY_ON_WINDOW) : Infinity;
        }
      } else if (body.state === "hang") {
        if (t >= until) {
          if (mode === "hang") afterHang();
          else if (mode === "climb") {
            body = { x: climbTo.x, y: climbTo.y, vx: 0, vy: 0, state: "ground", floorId: climbTo.floorId };
            climbTo = null;
            stayUntil = t + between(...STAY_ON_WINDOW);
            setMode("sit", 2);
          }
        }
      } else {
        if (mode === "walk") walk(dt);
        if (mode === "toEdge") {
          const x = body.x + dir * WALK_SPEED * (scale / 3) * dt;
          const reached = dir > 0 ? x >= edgeX : x <= edgeX;
          body = { ...body, x: reached ? edgeX : x };
          if (reached) setMode("lookdown", LOOKDOWN_SECONDS);
        }
        const special = ["crouch", "toEdge", "lookdown", "land"].includes(mode);
        if (!special && mode !== "sleep" && perch && t >= stayUntil && floorOf(body.floorId)?.kind === "window") {
          stayUntil = Infinity;
          goEdge();
        } else if (t >= until) advance();
      }
    }
    if (hoverSince !== null && !hoverShown && t - hoverSince >= HOVER_SECONDS) {
      hoverShown = true;
      bubble({ kind: "info", name: pet.name, full: Math.round(pet.stats.full), mood: Math.round(pet.stats.mood), affinity: pet.affinity.points });
    }
    emit();
  }

  return {
    tick,
    feed() {
      if (mode === "sleep") return bubble({ kind: "sleeping" });
      pet.stats = feed(pet.stats, clock);
      const unlocked = care("feed");
      if (!unlocked && body.state === "ground" && mode !== "held") setMode("eat", EAT_SECONDS);
      happyUntil = t + EAT_SECONDS;
      bubble({ kind: "feed", hearts: 0, bowl: true });
    },
    pat() {
      if (mode === "sleep") return bubble({ kind: "sleeping" });
      const r = pat(pet.stats, clock, lastPatAt);
      if (!r.counted) return;
      lastPatAt = clock;
      pet.stats = r.stats;
      const unlocked = care("pat");
      happyUntil = t + HAPPY_SECONDS;
      if (!unlocked && body.state === "ground" && mode !== "held") setMode("sit", 3);
      bubble({ kind: "pat", hearts: 3 });
    },
    sleepToggle() {
      if (mode === "sleep") { setMode("sit", 2); bubble({ kind: "woke" }); }
      else if (body.state === "ground" && mode !== "held") setMode("sleep", 10);
    },
    grab(sx, sy, nowMs = clock) {
      pointer = { downAt: nowMs, x0: sx, y0: sy, dx: body.x - sx, dy: body.y - sy, held: false };
    },
    drag(sx, sy) {
      if (!pointer) return;
      if (!pointer.held && Math.hypot(sx - pointer.x0, sy - pointer.y0) >= CLICK_MOVE) {
        pointer.held = true;
        setMode("held", Infinity);
        body = { ...body, state: "held", vx: 0, vy: 0, floorId: null };
      }
      if (pointer.held) { body = { ...body, x: sx + pointer.dx, y: sy + pointer.dy }; emit(); }
    },
    release(sx, sy, nowMs = clock) {
      if (!pointer) return;
      const p = pointer;
      pointer = null;
      if (!p.held) {
        if (nowMs - p.downAt < CLICK_MS) this.pat();
        return;
      }
      body = relocate({ ...body, state: "air" }, floors, screens);
      setMode("fall", Infinity);
    },
    hover(over) {
      if (over && hoverSince === null) { hoverSince = t; hoverShown = false; }
      if (!over) hoverSince = null;
    },
    setDisplays(next) {
      screens = next;
      rebuildFloors();
      if (windowIdOf(body.floorId)) followWindow(wins);
      else body = relocate(body, floors, screens);
    },
    setWindows(next) {
      const prev = wins;
      wins = next;
      rebuildFloors();
      followWindow(prev);
      emit();
    },
    setPerch(on) {
      perch = !!on;
      data.settings.perchOnWindows = perch;
      rebuildFloors();
      if (windowIdOf(body.floorId) && !perch) fallNow();
    },
    getFloors: () => floors.map(f => ({ ...f })),
    setScale(s) { scale = s; data.settings.scale = s; lastWin = null; emit(); },
    summon() {
      const f = floors.find(fl => fl.kind === "ground") || floors[0];
      body = { x: (f.x1 + f.x2) / 2, y: f.y - 200, vx: 0, vy: 0, state: "air", floorId: null };
      setMode("fall", Infinity);
    },
    getFrame: () => ({ key: lastKey, flip: !!lastFlip }),
    getBody: () => ({ ...body }),
    getMode: () => mode,
    getPet: () => pet,
    getSave() {
      const floor = floors.find(f => f.id === body.floorId);
      if (floor && floor.kind === "ground" && body.state === "ground") pet.position = { displayId: floor.displayId, x: Math.round(body.x), floor: "ground" };
      return data;
    }
  };
}

module.exports = { createPetController, petWindowSize, localDay };

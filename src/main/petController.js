// 펫 한 마리의 시뮬레이션: 상태 수치, 행동, 물리, 입력, 그림 키 고르기.
// Electron에 의존하지 않는다. 창 이동·그림·말풍선은 콜백으로만 내보낸다.
const { decay, feed, pat, isSad } = require("../core/stats.js");
const { addCare } = require("../core/affinity.js");
const { createBrain } = require("../core/brain.js");
const { groundFloors } = require("../core/floors.js");
const { stepBody, relocate } = require("../core/physics.js");

const WALK_SPEED = 40;            // px/s (크기 3배 기준)
const CLICK_MOVE = 6, CLICK_MS = 400;
const LAND_SECONDS = 0.15, EAT_SECONDS = 3.2, HAPPY_SECONDS = 2.6;
const HOVER_SECONDS = 0.6;
const TRICK_FPS = { stretch: 1.5, roll: 4, chase: 6 };
const TRICK_FRAMES = { stretch: 2, roll: 2, chase: 4 };

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
  let floors = groundFloors(displays);
  let screens = displays;
  let clock = now, t = 0;
  let mode = "sit", until = 0, variant = null, dir = 1;
  let happyUntil = -1, lastPatAt = null;
  let pointer = null;             // { downAt, x0, y0, dx, dy, held }
  let hoverSince = null, hoverShown = false;
  let lastKey = null, lastFlip = null, lastWin = null;

  pet.stats = decay(pet.stats, now, { running: false });

  function initialBody() {
    const pos = pet.position;
    const floor = (pos && floors.find(f => f.id === `ground:${pos.displayId}`)) || floors[0];
    const x = pos && floor.id === `ground:${pos.displayId}` ? Math.min(Math.max(pos.x, floor.x1), floor.x2) : (floor.x1 + floor.x2) / 2;
    return { x, y: floor.y, vx: 0, vy: 0, state: "ground", floorId: floor.id };
  }
  let body = initialBody();

  const halfW = () => 22 * scale;
  const bubble = b => onBubble && onBubble(b);

  function setMode(m, seconds, v = null) { mode = m; until = t + seconds; variant = v; }

  function pickNext() {
    const next = brain.next({ sad: isSad(pet.stats), hour: new Date(clock).getHours(), unlocked: pet.affinity.unlocked, onWindow: false });
    setMode(next.state, next.duration, next.variant || null);
    if (next.state === "walk" && rng() < 0.35) dir = -dir;
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

  function frameKey() {
    if (mode === "held") return `held:${Math.floor(t * 4) % 2}:`;
    if (body.state === "air") return "fall:0:";
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
    clock = nowMs; t += dt;
    pet.stats = decay(pet.stats, nowMs, { running: true, sleeping: mode === "sleep" });
    if (mode !== "held") {
      if (body.state === "air") {
        const r = stepBody(body, dt, floors);
        body = r.body;
        if (r.landed) setMode("land", LAND_SECONDS);
      } else {
        if (mode === "walk") walk(dt);
        if (t >= until) pickNext();
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
      floors = groundFloors(next);
      body = relocate(body, floors, screens);
    },
    setScale(s) { scale = s; data.settings.scale = s; lastWin = null; emit(); },
    summon() {
      const f = floors[0];
      body = { x: (f.x1 + f.x2) / 2, y: f.y - 200, vx: 0, vy: 0, state: "air", floorId: null };
      setMode("fall", Infinity);
    },
    getBody: () => ({ ...body }),
    getMode: () => mode,
    getPet: () => pet,
    getSave() {
      const floor = floors.find(f => f.id === body.floorId);
      if (floor && body.state === "ground") pet.position = { displayId: floor.displayId, x: Math.round(body.x), floor: "ground" };
      return data;
    }
  };
}

module.exports = { createPetController, petWindowSize, localDay };

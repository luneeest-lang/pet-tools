// 낙하와 착지. body.x = 발 가운데, body.y = 발 바닥(화면 좌표, 아래로 갈수록 커짐).
const { clampToDisplays, inArea } = require("./floors.js");
const GRAVITY = 2400, MAX_FALL = 1400;

function stepBody(body, dt, floors) {
  if (body.state !== "air") return { body, landed: false };
  const vy = Math.min(MAX_FALL, body.vy + GRAVITY * dt);
  const nx = body.x + body.vx * dt, ny = body.y + vy * dt;
  // 이번 스텝에서 위에서 아래로 지나간 바닥 중 가장 높은 것에 착지한다(큰 dt에서도 뚫지 않음).
  let hit = null;
  for (const f of floors) if (nx >= f.x1 && nx <= f.x2 && f.y >= body.y && f.y <= ny && (!hit || f.y < hit.y)) hit = f;
  if (hit) return { body: { x: nx, y: hit.y, vx: 0, vy: 0, state: "ground", floorId: hit.id }, landed: true };
  return { body: { ...body, x: nx, y: ny, vy }, landed: false };
}

// 화면 구성이 바뀌거나 화면 밖에 놓였을 때: 발밑 바닥이 사라졌거나 화면 밖이면 화면 안으로 끌어와 떨어지게 한다.
function relocate(body, floors, displays) {
  const onScreen = displays.some(d => inArea(body, d.workArea));
  if (body.state === "ground") {
    const f = floors.find(fl => fl.id === body.floorId);
    if (f && onScreen && body.x >= f.x1 && body.x <= f.x2) return body;
  } else if (onScreen) return body;
  const p = clampToDisplays(body, displays);
  return { x: p.x, y: p.y, vx: 0, vy: 0, state: "air", floorId: null };
}

module.exports = { stepBody, relocate, GRAVITY, MAX_FALL };

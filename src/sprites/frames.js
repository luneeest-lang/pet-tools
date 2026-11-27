// 앱이 쓰는 모든 동작 프레임 목록과, 스펙 하나의 모든 프레임 만들기
const { renderFrame } = require("./render.js");
const { packFrames } = require("./packs.js");

const POSES = { walk: 6, sit: 2, sleep: 2, crouch: 1, air: 2, land: 1, fall: 1, held: 2, lookdown: 1, stretch: 2, roll: 2, chase: 4 };

function frameKey(pose, frame, flags) {
  const on = Object.keys(flags || {}).filter(k => flags[k]).sort();
  return `${pose}:${frame}:${on.join(",")}`;
}

const FRAME_LIST = [];
for (const [pose, n] of Object.entries(POSES)) for (let f = 0; f < n; f++) FRAME_LIST.push({ pose, frame: f, flags: {} });
FRAME_LIST.push(
  { pose: "sit", frame: 0, flags: { blink: true } },
  { pose: "sit", frame: 0, flags: { happy: true } },
  { pose: "sit", frame: 1, flags: { happy: true } },
  { pose: "sit", frame: 0, flags: { yawn: true } },
  { pose: "sit", frame: 0, flags: { sad: true } },
  { pose: "sit", frame: 1, flags: { sad: true } }
);
FRAME_LIST.forEach(f => { f.key = frameKey(f.pose, f.frame, f.flags); });

function renderAllFrames(spec) {
  if (spec.pack) {
    // 그림 묶음에 없는 동작은 앉은 그림으로 채운다(그림 크기가 섞이지 않게).
    const pack = packFrames(spec.pack), out = new Map();
    for (const f of FRAME_LIST) out.set(f.key, pack.get(f.key) || pack.get(`${f.pose}:0:`) || pack.get("sit:0:"));
    return out;
  }
  const out = new Map();
  for (const f of FRAME_LIST) out.set(f.key, renderFrame(spec, f.pose, f.frame, f.flags));
  return out;
}

module.exports = { POSES, FRAME_LIST, frameKey, renderAllFrames };

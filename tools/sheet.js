// 그림 시트 HTML 만들기: 사람이 눈으로 확인하는 용도.
// node tools/sheet.js --presets > out/presets.html
// node tools/sheet.js --spec my-pet.json > out/pet.html
const fs = require("fs");
const { PRESETS } = require("../src/sprites/presets.js");
const { renderFrame } = require("../src/sprites/render.js");

const FRAMES = [
  ...[0, 1, 2, 3, 4, 5].map(f => ["walk", f, {}]),
  ["sit", 0, {}], ["sit", 0, { blink: true }], ["sit", 1, { happy: true }], ["sit", 0, { yawn: true }],
  ["sleep", 0, {}], ["sleep", 1, {}]
];
let frames = FRAMES;
try { frames = require("../src/sprites/frames.js").FRAME_LIST.map(f => [f.pose, f.frame, f.flags]); } catch (e) { /* frames.js는 Task 4에서 생김 */ }

const args = process.argv.slice(2);
let targets = PRESETS.map(p => ({ label: `${p.name.ko} (${p.id})`, spec: p.spec }));
const si = args.indexOf("--spec");
if (si >= 0) targets = [{ label: args[si + 1], spec: JSON.parse(fs.readFileSync(args[si + 1], "utf8")) }];

const data = targets.map(t => ({ label: t.label, frames: frames.map(([pose, f, flags]) => ({ name: `${pose}:${f}:${Object.keys(flags).join(",")}`, ...renderFrame(t.spec, pose, f, flags) })) }));
const S = 4;
process.stdout.write(`<!doctype html><meta charset="utf-8"><title>sprite sheet</title>
<body style="margin:0;background:#cfe0ee;font:12px sans-serif">
<script>
const DATA=${JSON.stringify(data)};const S=${S};
for (const t of DATA){const h=document.createElement('div');h.textContent=t.label;h.style.margin='6px 8px 0';document.body.appendChild(h);
const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap';document.body.appendChild(row);
for(const fr of t.frames){const c=document.createElement('canvas');c.width=48*S;c.height=40*S;c.title=fr.name;const g=c.getContext('2d');
fr.shadow.forEach((on,i)=>{if(on){g.fillStyle='rgba(30,20,40,.16)';g.fillRect(i%48*S,Math.floor(i/48)*S,S,S)}});
fr.px.forEach((col,i)=>{if(col){g.fillStyle=col;g.fillRect(i%48*S,Math.floor(i/48)*S,S,S)}});row.appendChild(c);}}
</script>`);

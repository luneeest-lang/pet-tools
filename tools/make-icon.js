// 앱 아이콘 만들기: 시바견 "보리"의 앉은 그림 얼굴을 256x256 PNG로 키워 build/icon.png에 저장한다.
// 실행: node tools/make-icon.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { PRESETS } = require("../src/sprites/presets.js");
const { renderFrame } = require("../src/sprites/render.js");

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const spec = PRESETS.find(p => p.id === "shiba").spec;
const fr = renderFrame(spec, "sit", 0, {});
const crop = 32, x0 = 14, y0 = 0, S = 8, size = crop * S;
const rgba = Buffer.alloc(size * size * 4);
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const col = fr.px[(y0 + Math.floor(y / S)) * 48 + x0 + Math.floor(x / S)];
  if (!col) continue;
  const n = parseInt(col.slice(1), 16), i = (y * size + x) * 4;
  rgba[i] = (n >> 16) & 255; rgba[i + 1] = (n >> 8) & 255; rgba[i + 2] = n & 255; rgba[i + 3] = 255;
}
fs.writeFileSync(path.join(__dirname, "..", "build", "icon.png"), png(size, size, rgba));
console.log("build/icon.png", size + "x" + size);

// 트레이 아이콘: 펫 자신의 앉은 그림에서 얼굴 부분을 잘라 아이콘으로 쓴다.
const { Tray, Menu, nativeImage } = require("electron");
const { renderAllFrames } = require("../sprites/frames.js");
const { bounds } = require("../sprites/packs.js");
const { buildMenuTemplate } = require("./menu.js");
const { t } = require("./i18n.js");

// 앉은 그림에서 머리 쪽(위·오른쪽) 정사각형을 잘라 32x32로 줄인다.
function petIcon(spec) {
  const fr = renderAllFrames(spec).get("sit:0:");
  const b = bounds(fr.px, fr.w, fr.h);
  const side = Math.max(8, Math.round(Math.min(b.x1 - b.x0 + 1, b.y1 - b.y0 + 1) * 0.72));
  const x0 = Math.max(0, b.x1 + 1 - side), y0 = b.y0;
  const size = 32;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sx = x0 + Math.floor(x * side / size), sy = y0 + Math.floor(y * side / size);
    const col = sx < fr.w && sy < fr.h ? fr.px[sy * fr.w + sx] : null;
    if (!col) continue;
    const n = parseInt(col.slice(1), 16), i = (y * size + x) * 4;
    buf[i] = n & 255; buf[i + 1] = (n >> 8) & 255; buf[i + 2] = (n >> 16) & 255; buf[i + 3] = 255; // BGRA
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 2 });
}

function createTray({ spec, name, lang, getState, handlers }) {
  const tray = new Tray(petIcon(spec));
  const menu = () => Menu.buildFromTemplate(buildMenuTemplate(getState(), lang(), handlers));
  tray.setToolTip(t("tray.tooltip", lang(), { name }));
  tray.on("click", () => tray.popUpContextMenu(menu()));
  tray.on("right-click", () => tray.popUpContextMenu(menu()));
  return {
    tray,
    popup: win => menu().popup({ window: win }),
    refresh: (nextSpec, nextName) => { tray.setImage(petIcon(nextSpec)); tray.setToolTip(t("tray.tooltip", lang(), { name: nextName })); }
  };
}

module.exports = { createTray, petIcon };

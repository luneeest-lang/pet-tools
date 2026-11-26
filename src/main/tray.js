// 트레이 아이콘: 펫 자신의 앉은 그림에서 얼굴 부분을 잘라 아이콘으로 쓴다.
const { Tray, Menu, nativeImage } = require("electron");
const { renderFrame } = require("../sprites/render.js");
const { buildMenuTemplate } = require("./menu.js");
const { t } = require("./i18n.js");

function petIcon(spec) {
  const fr = renderFrame(spec, "sit", 0, {});
  const size = 32, x0 = 14, y0 = 0;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const col = fr.px[(y0 + y) * 48 + (x0 + x)];
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

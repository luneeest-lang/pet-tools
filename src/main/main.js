// 앱 시작: 저장 불러오기 → 펫 창 → 시뮬레이션 루프(30fps) → 주기적 저장
const path = require("path");
const { app, screen, ipcMain } = require("electron");
const { loadSave, writeSave } = require("../core/save.js");
const { renderAllFrames } = require("../sprites/frames.js");
const { createPetController, petWindowSize } = require("./petController.js");
const { createPetWindow } = require("./petWindow.js");
const { bubbleText } = require("./i18n.js");

const FPS = 30, SAVE_EVERY_MS = 5000;

if (!app.requestSingleInstanceLock()) app.quit();

const state = { win: null, controller: null, data: null, file: null, lang: "en", hidden: false, debug: false, hooks: [] };

const displaysNow = () => screen.getAllDisplays().map(d => ({ id: d.id, bounds: d.bounds, workArea: d.workArea }));

function sendFrames() {
  const pet = state.controller.getPet();
  const frames = {};
  for (const [key, fr] of renderAllFrames(pet.spec)) frames[key] = { px: fr.px, shadow: fr.shadow };
  state.win.webContents.send("pet:frames", { frames, scale: state.data.settings.scale });
}

function save() {
  try { writeSave(state.file, state.controller.getSave()); } catch (e) { state.hooks.forEach(h => h("save-error", e)); }
}

function start() {
  state.lang = (state.data.settings.language) || (app.getLocale().startsWith("ko") ? "ko" : "en");
  state.win = createPetWindow(state.data.settings.scale);
  state.controller = createPetController({
    save: state.data, displays: displaysNow(), now: Date.now(),
    onFrame: f => state.win.webContents.send("pet:show", f),
    onMoveWindow: p => {
      const { w, h } = petWindowSize(state.controller ? state.controller.getSave().settings.scale : state.data.settings.scale);
      state.win.setBounds({ x: p.x, y: p.y, width: w, height: h });
    },
    onBubble: b => state.win.webContents.send("pet:bubble", { ...b, text: bubbleText(b, state.lang) })
  });

  ipcMain.on("pet:ready", () => sendFrames());
  ipcMain.on("pet:hit", (_e, hit) => state.win.setIgnoreMouseEvents(!hit, { forward: true }));
  ipcMain.on("pet:hover", (_e, over) => state.controller.hover(over));
  ipcMain.on("pet:pointer", (_e, p) => {
    if (p.type === "down") state.controller.grab(p.x, p.y, Date.now());
    else if (p.type === "move") state.controller.drag(p.x, p.y);
    else state.controller.release(p.x, p.y, Date.now());
  });
  ipcMain.on("pet:context", () => state.hooks.forEach(h => h("context")));

  const refresh = () => state.controller.setDisplays(displaysNow());
  screen.on("display-added", refresh);
  screen.on("display-removed", refresh);
  screen.on("display-metrics-changed", refresh);

  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    state.controller.tick(dt, now);
  }, 1000 / FPS);
  setInterval(save, SAVE_EVERY_MS);
  state.hooks.forEach(h => h("started"));
}

app.whenReady().then(() => {
  state.file = path.join(app.getPath("userData"), "save.json");
  const lang = app.getLocale().startsWith("ko") ? "ko" : "en";
  state.data = loadSave(state.file, Date.now(), lang).data;
  start();
});

app.on("before-quit", () => { if (state.controller) save(); });
app.on("window-all-closed", () => { /* 트레이 앱: 창이 없어도 종료하지 않는다 */ });

module.exports = { state, sendFrames, save };

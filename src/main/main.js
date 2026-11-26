// 앱 시작: 저장 불러오기 → 펫 창 → 시뮬레이션 루프(30fps) → 주기적 저장
const path = require("path");
const { app, screen, ipcMain, shell, BrowserWindow } = require("electron");
const { loadSave, writeSave } = require("../core/save.js");
const { renderAllFrames } = require("../sprites/frames.js");
const { createPetController, petWindowSize } = require("./petController.js");
const { createPetWindow } = require("./petWindow.js");
const { bubbleText, STRINGS } = require("./i18n.js");
const { createTray } = require("./tray.js");
const { openSettings } = require("./settingsWindow.js");
const diag = require("./diagnostics.js");
const { hitTest } = require("./hitTest.js");

const FPS = 30, SAVE_EVERY_MS = 5000;

if (!app.requestSingleInstanceLock()) app.quit();

const state = { win: null, controller: null, tray: null, data: null, file: null, lang: "en", hidden: false, debug: false, hooks: [],
  frames: {}, lastHit: null, pointerDown: false };
process.on("uncaughtException", e => diag.log("uncaught", e.stack || String(e)));
process.on("unhandledRejection", e => diag.log("unhandled", (e && e.stack) || String(e)));

const displaysNow = () => screen.getAllDisplays().map(d => ({ id: d.id, bounds: d.bounds, workArea: d.workArea }));

function sendFrames() {
  const pet = state.controller.getPet();
  const frames = {};
  for (const [key, fr] of renderAllFrames(pet.spec)) frames[key] = { px: fr.px, shadow: fr.shadow };
  state.frames = frames;
  state.win.webContents.send("pet:frames", { frames, scale: state.controller.getSave().settings.scale });
}

function save() {
  try { writeSave(state.file, state.controller.getSave()); } catch (e) { state.hooks.forEach(h => h("save-error", e)); }
}

// 커서가 펫 그림 위에 있을 때만 창이 클릭을 받는다. Windows의 마우스 이동 전달에 기대지 않고
// 매 틱 커서 위치를 직접 읽는다(창을 숨겼다 보이거나 화면 밖에 나갔다 와도 굳지 않게).
function updateHit() {
  if (!state.win || state.win.isDestroyed()) return;
  const f = state.controller.getFrame();
  const hit = state.pointerDown || (!state.hidden && hitTest({
    frames: state.frames, key: f.key, flip: f.flip, scale: state.controller.getSave().settings.scale,
    win: state.win.getBounds(), cursor: screen.getCursorScreenPoint()
  }));
  if (hit === state.lastHit) return;
  state.lastHit = hit;
  state.win.setIgnoreMouseEvents(!hit, { forward: true });
  state.controller.hover(hit && !state.pointerDown);
}

function toggleHidden() {
  state.hidden = !state.hidden;
  if (state.hidden) state.win.hide(); else state.win.showInactive();
  state.lastHit = null; // 다시 보일 때 클릭 통과 설정을 새로 건다
  diag.log("hidden", state.hidden);
}

function applyStartup(settings) {
  if (process.platform === "win32" && app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!settings.launchAtStartup });
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
    onBubble: b => { diag.log("bubble", b.kind); state.win.webContents.send("pet:bubble", { ...b, text: bubbleText(b, state.lang) }); }
  });

  ipcMain.on("pet:ready", () => sendFrames());
  ipcMain.on("pet:pointer", (_e, p) => {
    state.pointerDown = p.type !== "up";
    if (p.type === "down") state.controller.grab(p.x, p.y, Date.now());
    else if (p.type === "move") state.controller.drag(p.x, p.y);
    else state.controller.release(p.x, p.y, Date.now());
  });
  ipcMain.on("pet:context", () => { state.tray.popup(state.win); state.hooks.forEach(h => h("context")); });

  const handlers = {
    feed: () => { if (state.hidden) toggleHidden(); state.controller.feed(); },
    summon: () => { if (state.hidden) toggleHidden(); state.controller.summon(); diag.log("summon"); },
    toggleHidden,
    settings: () => openSettings(),
    toggleDebug: () => { state.debug = !state.debug; state.win.webContents.send("pet:debug", state.debug); diag.log("debug", state.debug); },
    exportLog: () => {
      const file = diag.exportLog(app.getPath("desktop"), { version: app.getVersion(), os: process.getSystemVersion(), displays: displaysNow(), body: state.controller.getBody() });
      shell.showItemInFolder(file);
    },
    quit: () => app.quit()
  };
  const pet = state.controller.getPet();
  state.tray = createTray({ spec: pet.spec, name: pet.name, lang: () => state.lang, getState: () => ({ hidden: state.hidden, debug: state.debug }), handlers });

  ipcMain.handle("settings:get", () => {
    const settings = state.controller.getSave().settings;
    const table = STRINGS[state.lang];
    const text = {};
    for (const k of ["title", "size", "size2", "size3", "size4", "startup", "language", "close"]) text[k] = table["settings." + k];
    return { settings, text };
  });
  ipcMain.handle("settings:set", (_e, patch) => {
    const settings = state.controller.getSave().settings;
    if (patch.scale && [2, 3, 4].includes(patch.scale)) { state.controller.setScale(patch.scale); state.win.webContents.send("pet:scale", patch.scale); }
    if (typeof patch.launchAtStartup === "boolean") { settings.launchAtStartup = patch.launchAtStartup; applyStartup(settings); }
    if (patch.language === "ko" || patch.language === "en") { settings.language = patch.language; state.lang = patch.language; }
    diag.log("settings", patch);
    save();
    return settings;
  });
  ipcMain.on("settings:close", e => BrowserWindow.fromWebContents(e.sender)?.close());
  applyStartup(state.controller.getSave().settings);

  const refresh = () => { diag.log("displays", displaysNow()); state.controller.setDisplays(displaysNow()); };
  screen.on("display-added", refresh);
  screen.on("display-removed", refresh);
  screen.on("display-metrics-changed", refresh);

  // 움직임 간격은 단조 시계(시스템 시각 변경에 영향 없음)로, 수치 계산은 실제 시각으로 한다.
  let last = performance.now();
  setInterval(() => {
    const mono = performance.now();
    const dt = (mono - last) / 1000;
    last = mono;
    state.controller.tick(dt, Date.now());
    updateHit();
  }, 1000 / FPS);
  setInterval(save, SAVE_EVERY_MS);
  state.hooks.forEach(h => h("started"));
}

app.whenReady().then(() => {
  state.file = path.join(app.getPath("userData"), "save.json");
  const lang = app.getLocale().startsWith("ko") ? "ko" : "en";
  const loaded = loadSave(state.file, Date.now(), lang);
  state.data = loaded.data;
  diag.log("start", { recovered: loaded.recovered, lang, version: app.getVersion() });
  try { start(); } catch (e) { diag.log("start-failed", e.stack || String(e)); throw e; }
});

app.on("before-quit", () => { if (state.controller) save(); });
app.on("window-all-closed", () => { /* 트레이 앱: 창이 없어도 종료하지 않는다 */ });

module.exports = { state, sendFrames, save };

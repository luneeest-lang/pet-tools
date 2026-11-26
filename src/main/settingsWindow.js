// 설정 창: 크기, Windows 시작 시 자동 실행, 언어
const path = require("path");
const { BrowserWindow } = require("electron");

let win = null;
function openSettings() {
  if (win && !win.isDestroyed()) { win.show(); win.focus(); return win; }
  win = new BrowserWindow({
    width: 380, height: 330, resizable: false, minimizable: false, maximizable: false, show: false,
    autoHideMenuBar: true, backgroundColor: "#f4f6fb",
    webPreferences: { preload: path.join(__dirname, "..", "preload", "settings.js"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, "..", "renderer", "settings.html"));
  win.once("ready-to-show", () => win.show());
  return win;
}

module.exports = { openSettings };

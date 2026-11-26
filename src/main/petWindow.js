// 투명한 펫 창: 항상 위, 작업 표시줄·Alt+Tab에 안 나옴, 포커스를 빼앗지 않음, 투명 부분은 클릭 통과.
const path = require("path");
const { BrowserWindow } = require("electron");
const { petWindowSize } = require("./petController.js");

function createPetWindow(scale) {
  const { w, h } = petWindowSize(scale);
  const win = new BrowserWindow({
    width: w, height: h, show: false,
    transparent: true, frame: false, resizable: false, movable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false, hasShadow: false,
    fullscreenable: false, minimizable: false, maximizable: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "pet.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false
    }
  });
  win.setAlwaysOnTop(true, "floating");
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, "..", "renderer", "pet.html"));
  win.once("ready-to-show", () => win.showInactive());
  return win;
}

module.exports = { createPetWindow };

const test = require("node:test");
const assert = require("node:assert");
const { toDipWindows } = require("../../src/main/win32/convert.js");

const raw = (hwnd, extra = {}) => ({ hwnd, pid: 100, rect: { left: 100, top: 300, right: 900, bottom: 800 }, visible: true, minimized: false, cloaked: false, toolWindow: false, className: "Notepad", titleLength: 5, ...extra });
const identity = r => ({ x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top });

test("ordinary visible windows keep their z-order", () => {
  const out = toDipWindows([raw("A"), raw("B", { rect: { left: 0, top: 0, right: 400, bottom: 400 } })], 1, identity);
  assert.deepStrictEqual(out, [{ id: "A", x: 100, y: 300, width: 800, height: 500 }, { id: "B", x: 0, y: 0, width: 400, height: 400 }]);
});

test("hidden, minimized, cloaked, tool, untitled, shell and own windows are dropped", () => {
  const list = [
    raw("min", { minimized: true }), raw("hid", { visible: false }), raw("clk", { cloaked: true }), raw("tool", { toolWindow: true }),
    raw("untitled", { titleLength: 0 }), raw("tray", { className: "Shell_TrayWnd" }), raw("tray2", { className: "Shell_SecondaryTrayWnd" }),
    raw("desk", { className: "Progman" }), raw("worker", { className: "WorkerW" }), raw("mine", { pid: 1 }), raw("ok")
  ];
  assert.deepStrictEqual(toDipWindows(list, 1, identity).map(w => w.id), ["ok"]);
});

test("physical pixels are converted to screen coordinates", () => {
  const scale150 = r => ({ x: r.left / 1.5, y: r.top / 1.5, width: (r.right - r.left) / 1.5, height: (r.bottom - r.top) / 1.5 });
  const [w] = toDipWindows([raw("A", { rect: { left: 300, top: 450, right: 1500, bottom: 1200 } })], 1, scale150);
  assert.deepStrictEqual(w, { id: "A", x: 200, y: 300, width: 800, height: 500 });
});

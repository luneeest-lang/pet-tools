// Windows 창 목록 읽기(koffi로 user32·dwmapi 호출). Windows가 아니면 항상 빈 목록.
let api = null;

function load() {
  if (api !== null || process.platform !== "win32") return api;
  try {
    const koffi = require("koffi");
    const user32 = koffi.load("user32.dll");
    const dwm = koffi.load("dwmapi.dll");
    const RECT = koffi.struct("PT_RECT", { left: "int32", top: "int32", right: "int32", bottom: "int32" });
    api = {
      koffi, RECT,
      GetTopWindow: user32.func("void* __stdcall GetTopWindow(void* hWnd)"),
      GetWindow: user32.func("void* __stdcall GetWindow(void* hWnd, uint32 uCmd)"),
      IsWindowVisible: user32.func("bool __stdcall IsWindowVisible(void* hWnd)"),
      IsIconic: user32.func("bool __stdcall IsIconic(void* hWnd)"),
      GetWindowLongPtrW: user32.func("intptr __stdcall GetWindowLongPtrW(void* hWnd, int nIndex)"),
      GetWindowThreadProcessId: user32.func("uint32 __stdcall GetWindowThreadProcessId(void* hWnd, _Out_ uint32* pid)"),
      GetWindowTextLengthW: user32.func("int __stdcall GetWindowTextLengthW(void* hWnd)"),
      GetClassNameW: user32.func("int __stdcall GetClassNameW(void* hWnd, _Out_ uint16_t* buf, int max)"),
      GetForegroundWindow: user32.func("void* __stdcall GetForegroundWindow()"),
      // 같은 함수를 출력 형식만 바꿔 두 번 묶는다(이름 충돌을 피하려고 이름·인자를 따로 적는다).
      DwmGetRect: dwm.func("__stdcall", "DwmGetWindowAttribute", "int32", ["void*", "uint32", koffi.out(koffi.pointer(RECT)), "uint32"]),
      DwmGetInt: dwm.func("__stdcall", "DwmGetWindowAttribute", "int32", ["void*", "uint32", koffi.out(koffi.pointer("int32")), "uint32"])
    };
  } catch (e) {
    api = false;
    module.exports.lastError = e;
  }
  return api;
}

const GW_HWNDNEXT = 2, GWL_EXSTYLE = -20, WS_EX_TOOLWINDOW = 0x80;
const DWMWA_EXTENDED_FRAME_BOUNDS = 9, DWMWA_CLOAKED = 14, MAX_WINDOWS = 400;

const idOf = (a, h) => String(a.koffi.address(h));

function describe(a, h) {
  const pid = [0];
  a.GetWindowThreadProcessId(h, pid);
  const cls = new Uint16Array(64);
  const n = a.GetClassNameW(h, cls, 64);
  const rect = {};
  const okRect = a.DwmGetRect(h, DWMWA_EXTENDED_FRAME_BOUNDS, rect, 16) === 0;
  const cloaked = [0];
  a.DwmGetInt(h, DWMWA_CLOAKED, cloaked, 4);
  return {
    hwnd: idOf(a, h), pid: pid[0],
    rect: okRect ? rect : { left: 0, top: 0, right: 0, bottom: 0 },
    visible: a.IsWindowVisible(h), minimized: a.IsIconic(h), cloaked: cloaked[0] !== 0,
    toolWindow: (Number(a.GetWindowLongPtrW(h, GWL_EXSTYLE)) & WS_EX_TOOLWINDOW) !== 0,
    className: String.fromCharCode(...cls.slice(0, Math.max(0, n))),
    titleLength: a.GetWindowTextLengthW(h)
  };
}

// 맨 앞 창부터 z-순서로
function listWindows() {
  const a = load();
  if (!a) return [];
  try {
    const out = [];
    let h = a.GetTopWindow(null);
    for (let i = 0; h && i < MAX_WINDOWS; i++) {
      if (a.IsWindowVisible(h)) out.push(describe(a, h));
      h = a.GetWindow(h, GW_HWNDNEXT);
    }
    return out;
  } catch (e) {
    module.exports.lastError = e;
    return [];
  }
}

function foregroundHwnd() {
  const a = load();
  if (!a) return null;
  try { const h = a.GetForegroundWindow(); return h ? idOf(a, h) : null; } catch (e) { return null; }
}

module.exports = { listWindows, foregroundHwnd, lastError: null };

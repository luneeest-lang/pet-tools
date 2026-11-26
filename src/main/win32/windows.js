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
    lastError = e;
  }
  return api;
}

let lastError = null;
const handles = new Map(); // 창 id → 마지막으로 읽은 핸들 (한 창만 빨리 다시 읽을 때)

// 창 읽기가 켜졌는지, 아니면 왜 꺼졌는지(진단 로그용)
function status() {
  const a = load();
  let version = null;
  try { version = require("koffi/package.json").version; } catch (e) { /* 없음 */ }
  return { platform: process.platform, loaded: !!a, koffi: version, error: lastError ? String(lastError.stack || lastError) : null };
}

const GW_HWNDNEXT = 2, GWL_STYLE = -16, GWL_EXSTYLE = -20, WS_EX_TOOLWINDOW = 0x80, WS_CAPTION = 0x00C00000;
const DWMWA_EXTENDED_FRAME_BOUNDS = 9, DWMWA_CLOAKED = 14;
const MAX_VISIBLE = 400, MAX_STEPS = 5000;

const idOf = (a, h) => String(a.koffi.address(h));

// 값싼 검사(최소화, 도구 창, 제목 길이, 숨김)를 먼저 하고, 통과한 창만 테두리와 클래스 이름을 읽는다.
function describe(a, h) {
  const base = { hwnd: idOf(a, h), visible: true, rect: { left: 0, top: 0, right: 0, bottom: 0 }, className: "", pid: 0 };
  if (a.IsIconic(h)) return { ...base, minimized: true };
  if ((Number(a.GetWindowLongPtrW(h, GWL_EXSTYLE)) & WS_EX_TOOLWINDOW) !== 0) return { ...base, toolWindow: true };
  const titleLength = a.GetWindowTextLengthW(h);
  if (!(titleLength > 0)) return { ...base, titleLength };
  const cloaked = [0];
  a.DwmGetInt(h, DWMWA_CLOAKED, cloaked, 4);
  if (cloaked[0] !== 0) return { ...base, cloaked: true, titleLength };
  const pid = [0];
  a.GetWindowThreadProcessId(h, pid);
  const cls = new Uint16Array(64);
  const n = a.GetClassNameW(h, cls, 64);
  const rect = {};
  const okRect = a.DwmGetRect(h, DWMWA_EXTENDED_FRAME_BOUNDS, rect, 16) === 0;
  return {
    ...base, pid: pid[0], minimized: false, cloaked: false, toolWindow: false, titleLength,
    rect: okRect ? rect : base.rect,
    className: String.fromCharCode(...cls.slice(0, Math.max(0, n))),
    caption: (Number(a.GetWindowLongPtrW(h, GWL_STYLE)) & WS_CAPTION) === WS_CAPTION
  };
}

// 맨 앞 창부터 z-순서로
function listWindows() {
  const a = load();
  if (!a) return [];
  try {
    const out = [];
    handles.clear();
    let h = a.GetTopWindow(null);
    // 숨은 창은 세지 않는다(숨은 창이 많은 PC에서도 뒤쪽의 보이는 창을 놓치지 않게).
    for (let i = 0; h && i < MAX_STEPS && out.length < MAX_VISIBLE; i++) {
      if (a.IsWindowVisible(h)) {
        const w = describe(a, h);
        handles.set(w.hwnd, h);
        out.push(w);
      }
      h = a.GetWindow(h, GW_HWNDNEXT);
    }
    return out;
  } catch (e) {
    lastError = e;
    return [];
  }
}

// 창 하나만 다시 읽기(펫이 올라간 창을 빠르게 따라갈 때). 없어졌거나 숨었으면 null.
function refreshWindow(id) {
  const a = load();
  const h = handles.get(id);
  if (!a || !h) return null;
  try {
    if (!a.IsWindowVisible(h)) return null;
    return describe(a, h);
  } catch (e) {
    lastError = e;
    return null;
  }
}

function foregroundHwnd() {
  const a = load();
  if (!a) return null;
  try { const h = a.GetForegroundWindow(); return h ? idOf(a, h) : null; } catch (e) { return null; }
}

module.exports = { listWindows, refreshWindow, foregroundHwnd, status };

// Windows 창 정보(실제 픽셀) → 펫이 쓰는 창 목록(Electron 화면 좌표). Windows 없이 테스트할 수 있다.
const SHELL_CLASSES = new Set(["Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd"]);

function toDipWindows(raw, ownPid, toDip) {
  const out = [];
  for (const w of raw) {
    if (!w.visible || w.minimized || w.cloaked || w.toolWindow || !(w.titleLength > 0)) continue;
    if (SHELL_CLASSES.has(w.className) || w.pid === ownPid) continue;
    if (!(w.rect.right > w.rect.left && w.rect.bottom > w.rect.top)) continue;
    const d = toDip(w.rect);
    if (![d.x, d.y, d.width, d.height].every(Number.isFinite)) continue;
    out.push({ id: String(w.hwnd), x: d.x, y: d.y, width: d.width, height: d.height, ...(w.caption !== undefined ? { caption: !!w.caption } : {}) });
  }
  return out;
}

module.exports = { toDipWindows, SHELL_CLASSES };

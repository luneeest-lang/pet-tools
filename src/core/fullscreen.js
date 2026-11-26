// 전경 창이 어떤 화면을 통째로(±2px) 덮으면 전체 화면 앱으로 본다.
function isFullscreen(fg, displays) {
  if (!fg) return false;
  const near = (a, b) => Math.abs(a - b) <= 2;
  return displays.some(d => near(fg.x, d.bounds.x) && near(fg.y, d.bounds.y) &&
    near(fg.x + fg.width, d.bounds.x + d.bounds.width) && near(fg.y + fg.height, d.bounds.y + d.bounds.height));
}

module.exports = { isFullscreen };

// 전경 창이 제목 표시줄 없이 어떤 화면을 통째로(±2px) 덮으면 전체 화면 앱으로 본다.
// (작업 표시줄이 없는 모니터에서는 그냥 최대화한 창도 화면을 다 덮으므로 제목 표시줄로 구분한다.)
function isFullscreen(fg, displays) {
  if (!fg || fg.caption === true) return false;
  const near = (a, b) => Math.abs(a - b) <= 2;
  return displays.some(d => near(fg.x, d.bounds.x) && near(fg.y, d.bounds.y) &&
    near(fg.x + fg.width, d.bounds.x + d.bounds.width) && near(fg.y + fg.height, d.bounds.y + d.bounds.height));
}

module.exports = { isFullscreen };

// 커서가 펫 그림의 칠해진 칸 위에 있는지. 창 좌표·커서 좌표는 같은 화면 좌표(DIP)를 쓴다.
// 그림(w x h칸, 한 칸 = px 화면 픽셀)은 창의 가운데 아래에 붙어 있다(renderer/pet.js의 origin과 같은 규칙).
function hitTest({ frames, key, flip, px, win, cursor }) {
  const fr = frames && frames[key];
  if (!fr || !win || !cursor || !px) return false;
  const ox = win.x + Math.round((win.width - fr.w * px) / 2), oy = win.y + win.height - fr.h * px;
  let gx = Math.floor((cursor.x - ox) / px);
  const gy = Math.floor((cursor.y - oy) / px);
  if (gx < 0 || gy < 0 || gx >= fr.w || gy >= fr.h) return false;
  if (flip) gx = fr.w - 1 - gx;
  return !!fr.px[gy * fr.w + gx];
}

module.exports = { hitTest };

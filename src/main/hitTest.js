// 커서가 펫 그림의 칠해진 칸 위에 있는지. 창 좌표·커서 좌표는 같은 화면 좌표(DIP)를 쓴다.
// 그림은 창의 가운데 아래에 붙어 있다(renderer/pet.js의 origin과 같은 규칙).
function hitTest({ frames, key, flip, scale, win, cursor }) {
  const fr = frames && frames[key];
  if (!fr || !win || !cursor) return false;
  const ox = win.x + Math.round((win.width - 48 * scale) / 2), oy = win.y + win.height - 40 * scale;
  let gx = Math.floor((cursor.x - ox) / scale);
  const gy = Math.floor((cursor.y - oy) / scale);
  if (gx < 0 || gy < 0 || gx >= 48 || gy >= 40) return false;
  if (flip) gx = 47 - gx;
  return !!fr.px[gy * 48 + gx];
}

module.exports = { hitTest };

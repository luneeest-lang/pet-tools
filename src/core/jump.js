// 점프 궤적: 출발점에서 꼭짓점을 지나 목표점에 내려앉는 초기 속도
const { GRAVITY, MAX_FALL } = require("./physics.js");

// 높이 h만큼 떨어지는 데 걸리는 시간(최대 낙하 속도 제한 포함)
function fallTime(h) {
  const capAt = (MAX_FALL * MAX_FALL) / (2 * GRAVITY);
  if (h <= capAt) return Math.sqrt((2 * h) / GRAVITY);
  return MAX_FALL / GRAVITY + (h - capAt) / MAX_FALL;
}

function jumpVelocity(from, to, apex) {
  const peakY = Math.min(from.y, to.y) - Math.max(1, apex);
  const vy = -Math.sqrt(2 * GRAVITY * (from.y - peakY));
  const time = -vy / GRAVITY + fallTime(to.y - peakY);
  return { vx: (to.x - from.x) / time, vy, time };
}

module.exports = { jumpVelocity };

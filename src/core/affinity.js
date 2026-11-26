// 친밀도: 돌볼수록 쌓이고 줄지 않는다. 문턱을 넘으면 새 동작이 열린다.
const UNLOCKS = [{ at: 30, id: "stretch" }, { at: 80, id: "roll" }, { at: 150, id: "chase" }];
const FEED_POINTS = 3, PAT_POINTS = 2, PAT_CAP_PER_MIN = 6, DAILY_BONUS = 5;

function newAffinity() {
  return { points: 0, unlocked: [], lastCareDay: null, patWindow: { start: 0, gained: 0 } };
}

// localDay: 사용자 PC 기준 'YYYY-MM-DD'
function addCare(aff, kind, now, localDay) {
  const next = { ...aff, unlocked: [...aff.unlocked], patWindow: { ...(aff.patWindow || { start: 0, gained: 0 }) } };
  let gain = 0;
  if (kind === "feed") gain = FEED_POINTS;
  else if (kind === "pat") {
    const w = next.patWindow;
    if (now - w.start >= 60000 || now < w.start) { w.start = now; w.gained = 0; }
    gain = Math.max(0, Math.min(PAT_POINTS, PAT_CAP_PER_MIN - w.gained));
    w.gained += gain;
  }
  if (next.lastCareDay === null || localDay > next.lastCareDay) {
    gain += DAILY_BONUS;
    next.lastCareDay = localDay;
  }
  next.points += gain;
  const newlyUnlocked = UNLOCKS.filter(u => next.points >= u.at && !next.unlocked.includes(u.id)).map(u => u.id);
  next.unlocked.push(...newlyUnlocked);
  return { aff: next, newlyUnlocked };
}

module.exports = { UNLOCKS, newAffinity, addCare };

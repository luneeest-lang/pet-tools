// 다음 행동 고르기. 먹기·집히기·떨어지기·착지는 사용자 입력과 물리가 정하므로 여기서 고르지 않는다.
const DAY_ODDS = { walk: 0.5, sit: 0.25, yawn: 0.08, sleep: 0.10, trick: 0.07 };
const SAD_ODDS = { walk: 0.2, sit: 0.45, sleep: 0.3, yawn: 0.05 };
const NIGHT_SLEEP_FACTOR = 3;
const TRICK_SECONDS = 2;

const isNight = hour => hour >= 23 || hour < 6;

function oddsFor(ctx) {
  const odds = { ...(ctx.sad ? SAD_ODDS : DAY_ODDS) };
  if (odds.trick && !(ctx.unlocked && ctx.unlocked.length)) { odds.sit += odds.trick; delete odds.trick; }
  if (isNight(ctx.hour)) odds.sleep *= NIGHT_SLEEP_FACTOR;
  const total = Object.values(odds).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(odds)) odds[k] /= total;
  return odds;
}

function createBrain(rng = Math.random) {
  const between = (lo, hi) => lo + (hi - lo) * rng();
  return {
    next(ctx) {
      const odds = oddsFor(ctx);
      let r = rng(), state = "sit";
      for (const [k, p] of Object.entries(odds)) { if (r < p) { state = k; break; } r -= p; }
      switch (state) {
        case "walk": return { state, duration: between(3, 7) };
        case "sit": return { state, duration: between(2.5, 5.5) };
        case "yawn": return { state, duration: 1.8 };
        case "sleep": return { state, duration: isNight(ctx.hour) ? between(20, 40) : between(6, 12) };
        default: return { state: "trick", duration: TRICK_SECONDS, variant: ctx.unlocked[Math.floor(rng() * ctx.unlocked.length)] };
      }
    }
  };
}

module.exports = { createBrain, oddsFor, isNight };

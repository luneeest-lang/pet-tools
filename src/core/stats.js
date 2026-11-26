// 배부름·기분 (0~100). 시간은 ms.
const FULL_PER_10MIN = 4, MOOD_PER_10MIN = 3;
const OFFLINE_FLOOR = 40, SAD_BELOW = 30, PAT_COOLDOWN = 3000;

const clamp = v => Math.min(100, Math.max(0, v));

function lower(value, drop, running) {
  if (running) return Math.max(0, value - drop);
  // 앱이 꺼져 있던 동안에는 40 아래로 내려가지 않는다(이미 아래면 그대로).
  return value > OFFLINE_FLOOR ? Math.max(OFFLINE_FLOOR, value - drop) : value;
}

function decay(stats, now, { running, sleeping = false }) {
  const elapsed = now - stats.updatedAt;
  if (!(elapsed > 0)) return { ...stats, updatedAt: now };
  const tens = elapsed / 60000 / 10;
  return {
    ...stats,
    full: lower(stats.full, FULL_PER_10MIN * tens, running),
    mood: sleeping ? stats.mood : lower(stats.mood, MOOD_PER_10MIN * tens, running),
    updatedAt: now
  };
}

function feed(stats, now) {
  return { ...stats, full: clamp(stats.full + 35), mood: clamp(stats.mood + 5), updatedAt: now ?? stats.updatedAt };
}

function pat(stats, now, lastPatAt) {
  if (lastPatAt != null && now - lastPatAt >= 0 && now - lastPatAt < PAT_COOLDOWN) return { stats, counted: false };
  return { stats: { ...stats, mood: clamp(stats.mood + 12) }, counted: true };
}

function isSad(stats) {
  return stats.full < SAD_BELOW || stats.mood < SAD_BELOW;
}

module.exports = { decay, feed, pat, isSad, OFFLINE_FLOOR, SAD_BELOW };

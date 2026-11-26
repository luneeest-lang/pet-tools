// 화면 문구 (한국어, 영어)
const STRINGS = {
  ko: {
    "bubble.feed": "냠냠, 맛있어!",
    "bubble.pat": "헤헤, 좋아요",
    "bubble.sleeping": "쿨쿨... 자는 중이에요",
    "bubble.woke": "잘 잤다!",
    "bubble.unlock": "새 동작: {move}",
    "bubble.info": "{name} · 배부름 {full} · 기분 {mood} · 친밀도 {affinity}",
    "move.stretch": "기지개", "move.roll": "뒹굴기", "move.chase": "꼬리 잡기"
  },
  en: {
    "bubble.feed": "Yum, tasty!",
    "bubble.pat": "Hehe, I like that",
    "bubble.sleeping": "Zzz... sleeping",
    "bubble.woke": "What a nap!",
    "bubble.unlock": "New move: {move}",
    "bubble.info": "{name} · Full {full} · Mood {mood} · Bond {affinity}",
    "move.stretch": "Stretch", "move.roll": "Roll over", "move.chase": "Tail chase"
  }
};

function t(key, lang, vars = {}) {
  const table = STRINGS[lang] || STRINGS.en;
  const s = table[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

function bubbleText(b, lang) {
  if (b.kind === "unlock") return t("bubble.unlock", lang, { move: t(`move.${b.move}`, lang) });
  return t(`bubble.${b.kind}`, lang, b);
}

module.exports = { STRINGS, t, bubbleText };

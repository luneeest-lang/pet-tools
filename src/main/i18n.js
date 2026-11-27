// 화면 문구 (한국어, 영어)
const STRINGS = {
  ko: {
    "bubble.feed": "냠냠, 맛있어!",
    "bubble.pat": "헤헤, 좋아요",
    "bubble.sleeping": "쿨쿨... 자는 중이에요",
    "bubble.woke": "잘 잤다!",
    "bubble.unlock": "새 동작: {move}",
    "bubble.info": "{name}\n배부름 {full} · 기분 {mood}\n친밀도 {affinity}",
    "move.stretch": "기지개", "move.roll": "뒹굴기", "move.chase": "꼬리 잡기",
    "menu.feed": "밥 주기", "menu.summon": "펫 불러오기", "menu.hide": "잠시 숨기기", "menu.show": "다시 보이기",
    "menu.settings": "설정", "menu.debugOn": "진단 모드 켜기", "menu.debugOff": "진단 모드 끄기",
    "menu.exportLog": "로그 내보내기", "menu.quit": "종료",
    "settings.title": "설정", "settings.size": "크기", "settings.size2": "작게 (2배)", "settings.size3": "보통 (3배)", "settings.size4": "크게 (4배)",
    "settings.startup": "Windows를 켤 때 자동으로 실행", "settings.language": "언어", "settings.close": "닫기",
    "settings.behavior": "행동", "settings.perch": "열린 창 위에 올라가기", "settings.hideFullscreen": "게임·영상을 전체 화면으로 볼 때 숨기기",
    "tray.tooltip": "{name} 지내는 중"
  },
  en: {
    "bubble.feed": "Yum, tasty!",
    "bubble.pat": "Hehe, I like that",
    "bubble.sleeping": "Zzz... sleeping",
    "bubble.woke": "What a nap!",
    "bubble.unlock": "New move: {move}",
    "bubble.info": "{name}\nFull {full} · Mood {mood}\nBond {affinity}",
    "move.stretch": "Stretch", "move.roll": "Roll over", "move.chase": "Tail chase",
    "menu.feed": "Feed", "menu.summon": "Call pet", "menu.hide": "Hide for now", "menu.show": "Show again",
    "menu.settings": "Settings", "menu.debugOn": "Turn on diagnostics", "menu.debugOff": "Turn off diagnostics",
    "menu.exportLog": "Export log", "menu.quit": "Quit",
    "settings.title": "Settings", "settings.size": "Size", "settings.size2": "Small (2x)", "settings.size3": "Normal (3x)", "settings.size4": "Large (4x)",
    "settings.startup": "Start automatically with Windows", "settings.language": "Language", "settings.close": "Close",
    "settings.behavior": "Behavior", "settings.perch": "Climb onto open windows", "settings.hideFullscreen": "Hide while a game or video is fullscreen",
    "tray.tooltip": "{name} is hanging out"
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

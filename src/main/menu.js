// 트레이와 펫 오른쪽 클릭에서 같이 쓰는 메뉴. Electron 없이 테스트할 수 있게 템플릿만 만든다.
const { t } = require("./i18n.js");

function buildMenuTemplate(state, lang, h) {
  const items = [
    { label: t("menu.feed", lang), click: h.feed },
    { label: t("menu.summon", lang), click: h.summon },
    { label: t(state.hidden ? "menu.show" : "menu.hide", lang), click: h.toggleHidden },
    { type: "separator" },
    { label: t("menu.settings", lang), click: h.settings },
    { label: t(state.debug ? "menu.debugOff" : "menu.debugOn", lang), click: h.toggleDebug }
  ];
  if (state.debug) items.push({ label: t("menu.exportLog", lang), click: h.exportLog });
  items.push({ type: "separator" }, { label: t("menu.quit", lang), click: h.quit });
  return items;
}

module.exports = { buildMenuTemplate };

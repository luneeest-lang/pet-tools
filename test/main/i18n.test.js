const test = require("node:test");
const assert = require("node:assert");
const { STRINGS, t } = require("../../src/main/i18n.js");
const { buildMenuTemplate } = require("../../src/main/menu.js");

test("every string exists in Korean and English with the same variables", () => {
  const vars = s => (s.match(/\{\w+\}/g) || []).sort().join();
  assert.deepStrictEqual(Object.keys(STRINGS.ko).sort(), Object.keys(STRINGS.en).sort());
  for (const k of Object.keys(STRINGS.ko)) {
    assert.ok(STRINGS.ko[k] && STRINGS.en[k], k);
    assert.strictEqual(vars(STRINGS.ko[k]), vars(STRINGS.en[k]), k);
  }
  assert.strictEqual(t("bubble.unlock", "ko", { move: "기지개" }), "새 동작: 기지개");
});

const handlers = new Proxy({}, { get: (_o, k) => () => k });
const labels = tpl => tpl.filter(i => i.type !== "separator").map(i => i.label);

test("the menu offers feeding, summoning, hiding, settings, diagnostics and quit", () => {
  const ko = labels(buildMenuTemplate({ hidden: false, debug: false }, "ko", handlers));
  assert.deepStrictEqual(ko, ["밥 주기", "펫 불러오기", "잠시 숨기기", "설정", "진단 모드 켜기", "종료"]);
  const en = labels(buildMenuTemplate({ hidden: false, debug: false }, "en", handlers));
  assert.deepStrictEqual(en, ["Feed", "Call pet", "Hide for now", "Settings", "Turn on diagnostics", "Quit"]);
});

test("a hidden pet shows 'show again', and log export appears only in diagnostics mode", () => {
  const hidden = labels(buildMenuTemplate({ hidden: true, debug: false }, "ko", handlers));
  assert.ok(hidden.includes("다시 보이기") && !hidden.includes("잠시 숨기기"));
  assert.ok(!hidden.includes("로그 내보내기"));
  const debug = labels(buildMenuTemplate({ hidden: false, debug: true }, "ko", handlers));
  assert.ok(debug.includes("진단 모드 끄기") && debug.includes("로그 내보내기"));
});

test("no menu item is a placeholder for later", () => {
  for (const lang of ["ko", "en"]) for (const l of labels(buildMenuTemplate({ hidden: false, debug: true }, lang, handlers)))
    assert.ok(!/준비 중|coming soon|soon/i.test(l), l);
});

test("the two new settings have Korean and English labels", () => {
  for (const k of ["settings.perch", "settings.hideFullscreen"]) {
    assert.ok(STRINGS.ko[k] && STRINGS.en[k], k);
  }
});

test("the hover info fits the pet window: name on its own line, short lines", () => {
  const { bubbleText } = require("../../src/main/i18n.js");
  for (const lang of ["ko", "en"]) {
    const text = bubbleText({ kind: "info", name: "Bori", full: 100, mood: 100, affinity: 150 }, lang);
    const lines = text.split("\n");
    assert.strictEqual(lines[0], "Bori");
    assert.ok(lines.length >= 2);
    for (const l of lines) assert.ok(l.length <= 22, `${lang}: "${l}" (${l.length})`);
  }
});

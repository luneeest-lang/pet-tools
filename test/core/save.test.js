const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), os = require("os"), path = require("path");
const { defaultSave, migrate, loadSave, writeSave } = require("../../src/core/save.js");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "pet-save-"));
const NOW = Date.UTC(2026, 10, 26, 10);

test("default save adopts Bori with starting stats and settings", () => {
  const s = defaultSave(NOW, "ko");
  assert.strictEqual(s.version, 1);
  assert.strictEqual(s.pets.length, 1);
  const p = s.pets[0];
  assert.deepStrictEqual([p.origin, p.presetId, p.name], ["adopted", "shiba", "보리"]);
  assert.deepStrictEqual([p.stats.full, p.stats.mood, p.affinity.points], [70, 65, 0]);
  assert.deepStrictEqual(s.activePetIds, [p.id]);
  assert.deepStrictEqual(s.settings, { scale: 3, perchOnWindows: true, hideOnFullscreen: true, launchAtStartup: true, language: "ko" });
  assert.strictEqual(defaultSave(NOW, "en").pets[0].name, "Bori");
});

test("a missing file gives the default and does not create a file", () => {
  const file = path.join(tmp(), "save.json");
  const r = loadSave(file, NOW, "en");
  assert.strictEqual(r.recovered, false);
  assert.strictEqual(r.data.pets[0].name, "Bori");
  assert.strictEqual(fs.existsSync(file), false);
});

test("what is written reads back the same and leaves no temp file", () => {
  const dir = tmp(), file = path.join(dir, "save.json");
  const data = defaultSave(NOW, "ko");
  data.pets[0].affinity.points = 42;
  writeSave(file, data);
  assert.deepStrictEqual(loadSave(file, NOW, "ko").data, data);
  assert.deepStrictEqual(fs.readdirSync(dir), ["save.json"]);
});

for (const [label, content] of [["broken JSON", '{"version":1,"pets":[{'], ["an empty file", ""]]) {
  test(`${label} is set aside and the app starts fresh`, () => {
    const dir = tmp(), file = path.join(dir, "save.json");
    fs.writeFileSync(file, content);
    const r = loadSave(file, NOW, "ko");
    assert.strictEqual(r.recovered, true);
    assert.strictEqual(r.data.pets[0].presetId, "shiba");
    const broken = fs.readdirSync(dir).filter(n => /^save\.broken-\d+\.json$/.test(n));
    assert.strictEqual(broken.length, 1);
    assert.strictEqual(fs.readFileSync(path.join(dir, broken[0]), "utf8"), content);
    assert.strictEqual(fs.existsSync(file), false);
  });
}

test("an empty pet list gets the default pet and a dangling active id is repaired", () => {
  const empty = migrate({ version: 1, pets: [], settings: { scale: 2 } }, NOW, "ko");
  assert.strictEqual(empty.pets.length, 1);
  assert.strictEqual(empty.settings.scale, 2);
  assert.strictEqual(empty.settings.language, "ko");
  const s = defaultSave(NOW, "ko");
  s.activePetIds = ["nope"];
  assert.deepStrictEqual(migrate(s, NOW, "ko").activePetIds, [s.pets[0].id]);
});

test("unknown fields survive a round trip", () => {
  const s = defaultSave(NOW, "ko");
  s.future = 1;
  s.pets[0].accessories = [{ id: "hat" }];
  const m = migrate(JSON.parse(JSON.stringify(s)), NOW, "ko");
  assert.strictEqual(m.future, 1);
  assert.deepStrictEqual(m.pets[0].accessories, [{ id: "hat" }]);
});

// 저장 파일: userData/save.json. 깨지면 옆으로 치워 두고 새로 시작한다.
const fs = require("fs");
const path = require("path");
const { PRESETS } = require("../sprites/presets.js");
const { newAffinity } = require("./affinity.js");

const DEFAULT_SETTINGS = { scale: 3, perchOnWindows: true, hideOnFullscreen: true, launchAtStartup: true };

function adoptPreset(presetId, now, lang) {
  const preset = PRESETS.find(p => p.id === presetId);
  return {
    id: `p${now.toString(36)}`,
    name: preset.name[lang] || preset.name.en,
    createdAt: new Date(now).toISOString(),
    origin: "adopted",
    presetId,
    spec: JSON.parse(JSON.stringify(preset.spec)),
    stats: { full: 70, mood: 65, updatedAt: now },
    affinity: newAffinity(),
    accessories: [],
    position: null
  };
}

function defaultSave(now, lang) {
  const pet = adoptPreset("shiba", now, lang);
  return { version: 1, activePetIds: [pet.id], pets: [pet], settings: { ...DEFAULT_SETTINGS, language: lang } };
}

// 빠진 필드를 기본값으로 채우고, 모르는 필드는 그대로 둔다.
function migrate(raw, now, lang) {
  const base = defaultSave(now, lang);
  const data = { ...raw, version: 1 };
  data.settings = { ...base.settings, ...(raw.settings || {}) };
  data.pets = Array.isArray(raw.pets) && raw.pets.length ? raw.pets : base.pets;
  data.pets = data.pets.map(p => ({
    ...p,
    stats: { full: 70, mood: 65, updatedAt: now, ...(p.stats || {}) },
    affinity: { ...newAffinity(), ...(p.affinity || {}) },
    accessories: p.accessories || []
  }));
  const ids = new Set(data.pets.map(p => p.id));
  const active = (Array.isArray(raw.activePetIds) ? raw.activePetIds : []).filter(id => ids.has(id));
  data.activePetIds = active.length ? active : [data.pets[0].id];
  return data;
}

function loadSave(file, now, lang) {
  if (!fs.existsSync(file)) return { data: defaultSave(now, lang), recovered: false };
  let raw = null;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) { raw = null; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fs.renameSync(file, path.join(path.dirname(file), `save.broken-${Date.now()}.json`));
    return { data: defaultSave(now, lang), recovered: true };
  }
  return { data: migrate(raw, now, lang), recovered: false };
}

function writeSave(file, data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

module.exports = { defaultSave, adoptPreset, migrate, loadSave, writeSave, DEFAULT_SETTINGS };

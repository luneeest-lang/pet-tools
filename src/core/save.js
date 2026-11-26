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

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);

// 그릴 수 있는 펫인지: 스펙이 있거나, 아는 추천 조합 id가 있어야 한다.
function repairPet(p, now) {
  if (!isObj(p)) return null;
  let spec = isObj(p.spec) && (p.spec.species === "dog" || p.spec.species === "cat") ? p.spec : null;
  if (!spec && p.presetId) { const preset = PRESETS.find(x => x.id === p.presetId); if (preset) spec = JSON.parse(JSON.stringify(preset.spec)); }
  if (!spec) return null;
  const st = isObj(p.stats) ? p.stats : {};
  const aff = isObj(p.affinity) ? p.affinity : {};
  return {
    ...p,
    id: typeof p.id === "string" && p.id ? p.id : `p${now.toString(36)}`,
    name: typeof p.name === "string" ? p.name : "",
    spec,
    stats: { ...st, full: num(st.full, 70), mood: num(st.mood, 65), updatedAt: num(st.updatedAt, now) },
    affinity: { ...newAffinity(), ...aff, points: num(aff.points, 0), unlocked: Array.isArray(aff.unlocked) ? aff.unlocked : [] },
    accessories: Array.isArray(p.accessories) ? p.accessories : []
  };
}

// 빠진 필드를 기본값으로 채우고, 모르는 필드는 그대로 둔다.
function migrate(raw, now, lang) {
  const base = defaultSave(now, lang);
  const data = { ...raw, version: 1 };
  data.settings = { ...base.settings, ...(isObj(raw.settings) ? raw.settings : {}) };
  const pets = (Array.isArray(raw.pets) ? raw.pets : []).map(p => repairPet(p, now)).filter(Boolean);
  data.pets = pets.length ? pets : base.pets;
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
  if (!isObj(raw)) {
    // 옆으로 치우지 못해도(백신·동기화 프로그램이 잡고 있을 때) 기본값으로 시작한다.
    try { fs.renameSync(file, path.join(path.dirname(file), `save.broken-${Date.now()}.json`)); } catch (e) { /* 다음 저장 때 덮어쓴다 */ }
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

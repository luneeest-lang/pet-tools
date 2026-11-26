// 진단 모드: 최근 로그 2,000줄을 메모리에 두고, 바탕화면에 파일로 내보낸다.
const fs = require("fs");
const path = require("path");
const MAX_LINES = 2000;
const lines = [];

function log(...args) {
  const line = `${new Date().toISOString()} ${args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}`;
  lines.push(line);
  if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
}

function exportLog(desktopDir, extra = {}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(desktopDir, `pet-tools-log-${stamp}.txt`);
  const header = Object.entries(extra).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  fs.writeFileSync(file, [...header, "", ...lines].join("\n"));
  return file;
}

module.exports = { log, exportLog, lines };

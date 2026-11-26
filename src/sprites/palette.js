// 스펙 → 팔레트(색 키 → '#rrggbb')
const COMMON = { K: "#1b1214", H: "#ffffff", S: "#d9e6ff", P: "#f07a8c", PD: "#7c2a3a", B: "#f6a0ae" };

function buildPalette(spec) {
  if (spec.palette) return Object.assign({}, COMMON, spec.palette);
  throw new Error("automatic palette not implemented yet");
}

module.exports = { COMMON, buildPalette };

// 스펙 → 팔레트(색 키 → '#rrggbb'). 털색 하나에서 명암 5단계를 만든다.
const COMMON = { K: "#1b1214", H: "#ffffff", S: "#d9e6ff", P: "#f07a8c", PD: "#7c2a3a", B: "#f6a0ae", PAD: "#8a5a5e" };
const YELLOW = 50, PURPLE = 330;

const clamp01 = v => Math.min(1, Math.max(0, v));

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function hslToHex({ h, s, l }) {
  s = clamp01(s); l = clamp01(l); h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

// h를 target 쪽으로 짧은 방향으로 deg만큼 옮긴다(지나치지 않음).
function toward(h, target, deg) {
  const diff = ((target - h + 540) % 360) - 180;
  return h + Math.sign(diff) * Math.min(Math.abs(diff), deg);
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return "#" + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, "0")).join("");
}

function rampFromColor(hex) {
  const c = hexToHsl(hex.toLowerCase());
  const step = (dl, target, deg, ds) => hslToHex({ h: toward(c.h, target, deg), s: c.s + ds, l: c.l + dl });
  const h4 = toward(c.h, PURPLE, 18);
  // 아주 밝거나 어두운 색은 남은 밝기 여유 안에서 단계를 좁혀, 단계끼리 같은 색이 되지 않게 한다.
  const up = (d, k) => Math.min(d, (1 - c.l) * k), down = (d, k) => Math.min(d, c.l * k);
  return {
    0: step(up(0.20, 0.8), YELLOW, 10, -0.05),
    1: step(up(0.10, 0.45), YELLOW, 6, 0.02),
    2: hex.toLowerCase(),
    3: step(-down(0.13, 0.4), PURPLE, 10, -0.05),
    4: step(-down(0.27, 0.7), PURPLE, 18, -0.15),
    outline: hslToHex({ h: h4, s: 0.30, l: 0.12 }),
    outlineLit: hslToHex({ h: h4, s: 0.25, l: 0.25 })
  };
}

function autoPalette(spec) {
  const main = rampFromColor(spec.colors.main);
  const second = spec.colors.second ? rampFromColor(spec.colors.second) : main;
  const eye = hexToHsl(spec.eye || "#6a4a42");
  const pal = Object.assign({}, COMMON);
  for (let i = 0; i < 5; i++) { pal["F" + i] = main[i]; pal["C" + i] = second[i]; }
  pal.O = main.outline; pal.OL = main.outlineLit;
  pal.OC = spec.colors.second ? mix(second.outline, second[4], 0.45) : main.outline;
  pal.OCL = spec.colors.second ? mix(second.outlineLit, second[4], 0.6) : main.outlineLit;
  const earBase = spec.colors.second ? second[1] : main[1];
  pal.I1 = mix(earBase, "#f2a0a0", 0.45);
  pal.I2 = mix(pal.I1, main[4], 0.3);
  pal.IR = hslToHex(eye);
  pal.IR2 = hslToHex({ h: eye.h, s: eye.s, l: eye.l - 0.15 });
  pal.N = mix(main[4], "#1a1214", 0.75);
  pal.NH = mix(pal.N, "#ffffff", 0.35);
  pal.Q = mix("#e9858e", main[3], 0.2);
  pal.MO = mix(second[4], main[4], 0.5);
  pal.WH = spec.colors.second ? second[0] : mix(main[0], "#ffffff", 0.6);
  return pal;
}

function buildPalette(spec) {
  const auto = spec.colors ? autoPalette(spec) : Object.assign({}, COMMON);
  return spec.palette ? Object.assign(auto, COMMON, spec.palette) : auto;
}

module.exports = { COMMON, rampFromColor, buildPalette, hexToHsl, hslToHex, mix };

const test = require("node:test");
const assert = require("node:assert");
const { isFullscreen } = require("../../src/core/fullscreen.js");

const D = [
  { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
  { id: 2, bounds: { x: 1920, y: 0, width: 2560, height: 1440 }, workArea: { x: 1920, y: 0, width: 2560, height: 1400 } }
];

test("a window covering a whole screen is fullscreen", () => {
  assert.strictEqual(isFullscreen({ id: "v", x: 0, y: 0, width: 1920, height: 1080 }, D), true);
  assert.strictEqual(isFullscreen({ id: "g", x: 1919, y: -1, width: 2562, height: 1442 }, D), true);
});

test("a maximized window that leaves the taskbar visible is not fullscreen", () => {
  assert.strictEqual(isFullscreen({ id: "m", x: 0, y: 0, width: 1920, height: 1040 }, D), false);
});

test("no foreground window (desktop or taskbar in front) is not fullscreen", () => {
  assert.strictEqual(isFullscreen(null, D), false);
});

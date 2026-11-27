const test = require("node:test");
const assert = require("node:assert");
const { hitTest } = require("../../src/main/hitTest.js");

// 48x40 격자에서 (10,20) 한 칸만 칠한 그림
const px = new Array(1920).fill(null);
px[20 * 48 + 10] = "#ffffff";
const frames = { "sit:0:": { w: 48, h: 40, px } };
const scale = 3; // 화면에서 그림 한 칸 = 3px
const win = { x: 1000, y: 500, width: 48 * 3 + 80, height: 40 * 3 + 110 };
// 그림의 왼쪽 위: 창 가운데 아래 정렬
const ox = win.x + Math.round((win.width - 48 * scale) / 2), oy = win.y + win.height - 40 * scale;

test("the cursor over a painted pixel hits the pet", () => {
  assert.strictEqual(hitTest({ frames, key: "sit:0:", flip: false, px: scale, win, cursor: { x: ox + 10 * 3 + 1, y: oy + 20 * 3 + 1 } }), true);
});

test("the cursor over a transparent pixel or outside the window passes through", () => {
  assert.strictEqual(hitTest({ frames, key: "sit:0:", flip: false, px: scale, win, cursor: { x: ox + 11 * 3 + 1, y: oy + 20 * 3 + 1 } }), false);
  assert.strictEqual(hitTest({ frames, key: "sit:0:", flip: false, px: scale, win, cursor: { x: 0, y: 0 } }), false);
});

test("a mirrored frame is hit on the mirrored side", () => {
  assert.strictEqual(hitTest({ frames, key: "sit:0:", flip: true, px: scale, win, cursor: { x: ox + (47 - 10) * 3 + 1, y: oy + 20 * 3 + 1 } }), true);
  assert.strictEqual(hitTest({ frames, key: "sit:0:", flip: true, px: scale, win, cursor: { x: ox + 10 * 3 + 1, y: oy + 20 * 3 + 1 } }), false);
});

test("an unknown frame never hits", () => {
  assert.strictEqual(hitTest({ frames, key: "nope", flip: false, px: scale, win, cursor: { x: ox + 31, y: oy + 61 } }), false);
});

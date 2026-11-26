const test = require("node:test");
const assert = require("node:assert");

test("prototype sprite renders a full 48x40 grid", () => {
  require("../prototype/sprites/pixel-pet.js");
  assert.strictEqual(globalThis.PixelPet.render("shiba", "sit", 0, {}).px.length, 1920);
});

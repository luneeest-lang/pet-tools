// 펫 그리기, 투명 부분 클릭 통과 판정, 말풍선·하트·밥그릇·Zzz
(() => {
  const cv = document.getElementById("pet");
  const ctx = cv.getContext("2d");
  const layer = document.getElementById("layer");
  let frames = {}, scale = 3, current = null, debug = false;
  const cache = new Map();

  function resize() { cv.width = window.innerWidth; cv.height = window.innerHeight; draw(); }
  const origin = () => ({ ox: Math.round((cv.width - 48 * scale) / 2), oy: cv.height - 40 * scale });

  function sprite(key) {
    const k = key + "@" + scale;
    if (cache.has(k)) return cache.get(k);
    const fr = frames[key];
    if (!fr) return null;
    const c = document.createElement("canvas");
    c.width = 48 * scale; c.height = 40 * scale;
    const g = c.getContext("2d");
    fr.shadow.forEach((on, i) => { if (on) { g.fillStyle = "rgba(30,20,40,0.16)"; g.fillRect((i % 48) * scale, Math.floor(i / 48) * scale, scale, scale); } });
    fr.px.forEach((col, i) => { if (col) { g.fillStyle = col; g.fillRect((i % 48) * scale, Math.floor(i / 48) * scale, scale, scale); } });
    cache.set(k, c);
    return c;
  }

  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!current) return;
    const s = sprite(current.key);
    if (!s) return;
    const { ox, oy } = origin();
    ctx.save();
    if (current.flip) { ctx.translate(ox + s.width, oy); ctx.scale(-1, 1); ctx.drawImage(s, 0, 0); }
    else ctx.drawImage(s, ox, oy);
    ctx.restore();
    if (debug) { ctx.strokeStyle = "#e8466a"; ctx.beginPath(); ctx.moveTo(0, cv.height - 2 * scale + 0.5); ctx.lineTo(cv.width, cv.height - 2 * scale + 0.5); ctx.stroke(); ctx.strokeRect(ox + 0.5, oy + 0.5, 48 * scale - 1, 40 * scale - 1); }
    const zzz = layer.querySelector(".zzz");
    if (current.key.startsWith("sleep:") && !zzz) {
      const z = document.createElement("div"); z.className = "zzz"; z.textContent = "z Z";
      z.style.left = (ox + (current.flip ? 6 : 34) * scale) + "px"; z.style.top = (oy + 12 * scale) + "px";
      layer.appendChild(z);
    } else if (!current.key.startsWith("sleep:") && zzz) zzz.remove();
  }

  // 커서 아래 칸이 칠해져 있는지
  function hitAt(mx, my) {
    if (!current || !frames[current.key]) return false;
    const { ox, oy } = origin();
    let gx = Math.floor((mx - ox) / scale); const gy = Math.floor((my - oy) / scale);
    if (gx < 0 || gy < 0 || gx >= 48 || gy >= 40) return false;
    if (current.flip) gx = 47 - gx;
    return !!frames[current.key].px[gy * 48 + gx];
  }

  let lastHit = false, pressed = false, mouse = null;
  // 펫이 움직이거나 그림이 바뀌면 커서가 가만히 있어도 클릭 통과 여부를 다시 계산한다.
  function updateHit() {
    if (!mouse) return;
    const hit = pressed || hitAt(mouse.x, mouse.y);
    if (hit !== lastHit) { lastHit = hit; window.pet.send("pet:hit", hit); window.pet.send("pet:hover", hit && !pressed); }
  }
  window.addEventListener("mousemove", e => {
    mouse = { x: e.clientX, y: e.clientY };
    updateHit();
    if (pressed) window.pet.send("pet:pointer", { type: "move", x: e.screenX, y: e.screenY });
  });
  window.addEventListener("mouseleave", () => { mouse = null; if (!pressed && lastHit) { lastHit = false; window.pet.send("pet:hit", false); window.pet.send("pet:hover", false); } });
  window.addEventListener("pointerdown", e => {
    if (e.button !== 0 || !hitAt(e.clientX, e.clientY)) return;
    pressed = true; cv.setPointerCapture(e.pointerId);
    window.pet.send("pet:hover", false);
    window.pet.send("pet:pointer", { type: "down", x: e.screenX, y: e.screenY });
  });
  window.addEventListener("pointerup", e => {
    if (!pressed) return;
    pressed = false;
    window.pet.send("pet:pointer", { type: "up", x: e.screenX, y: e.screenY });
  });
  window.addEventListener("contextmenu", e => { e.preventDefault(); if (hitAt(e.clientX, e.clientY)) window.pet.send("pet:context", {}); });

  const HEART = [".oo.oo.", "o22o12o", "o22222o", ".o222o.", "..o2o..", "...o..."];
  const BOWL = ["......oooooo......", "....oo4544544oo...", "...o445445445544o.", "..oooooooooooooooo", "..o11111111111111o", "..o12222222222221o", "...o122222222221o.", "....o1222222221o..", ".....oooooooooo..."];
  function pixelCanvas(rows, pal, s) {
    const c = document.createElement("canvas");
    c.width = rows[0].length * s; c.height = rows.length * s;
    const g = c.getContext("2d");
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * s, y * s, s, s); } }));
    return c;
  }

  window.pet.on("pet:bubble", b => {
    const { ox, oy } = origin();
    const el = document.createElement("div");
    el.className = "bubble" + (b.kind === "info" ? " info" : "");
    el.textContent = b.text;
    el.style.top = Math.max(0, oy - 28) + "px";
    layer.appendChild(el);
    setTimeout(() => el.remove(), b.kind === "info" ? 3100 : 1900);
    for (let i = 0; i < (b.hearts || 0); i++) {
      const h = pixelCanvas(HEART, { o: "#7a1830", "1": "#ffd0dc", "2": "#ff5a7e" }, Math.max(2, scale - 1));
      h.className = "heart";
      h.style.left = (cv.width / 2 - 8 + (Math.random() * 40 - 20)) + "px";
      h.style.top = (oy + 6 * scale) + "px";
      h.style.setProperty("--dx", (Math.random() * 40 - 20) + "px");
      h.style.animationDelay = (i * 0.14) + "s";
      layer.appendChild(h);
      setTimeout(() => h.remove(), 1600 + i * 140);
    }
    if (b.bowl) {
      const bowl = pixelCanvas(BOWL, { o: "#5a1f1f", "1": "#ff7b7b", "2": "#e2474a", "4": "#a86a3a", "5": "#cf9358" }, scale);
      bowl.className = "heart";
      bowl.style.animation = "none";
      bowl.style.left = (current && current.flip ? ox - 6 * scale : ox + 40 * scale) + "px";
      bowl.style.top = (cv.height - 2 * scale - bowl.height) + "px";
      layer.appendChild(bowl);
      setTimeout(() => bowl.remove(), 3200);
    }
  });

  window.pet.on("pet:frames", d => { frames = d.frames; scale = d.scale; cache.clear(); resize(); });
  window.pet.on("pet:scale", s => { scale = s; cache.clear(); resize(); });
  window.pet.on("pet:show", f => { current = f; draw(); updateHit(); });
  window.pet.on("pet:debug", on => { debug = on; draw(); });
  window.addEventListener("resize", resize);
  resize();
  window.pet.send("pet:ready", {});
})();
